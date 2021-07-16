"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  //console.debug("generateStoryMarkup", story);

  let favBtn, deleteBtn, favClass, favorited;

  if (currentUser){
    favorited = story.isFavoritedBy(currentUser);
    const favSymbol = favorited ? '-' : '+';
    const favSymCSS = favorited ? 'favorite-icon-noHover' : 'favorite-icon';

    favClass = favorited ? 'story-favorited' : '';
    deleteBtn = story.isOwnedBy(currentUser) ? `<small class="del" id="${story.storyId}">(delete)</small>` : '';
    favBtn = `<span class=" favSym ${favSymCSS}">${favSymbol}</span>`;

  } else {
    favorited = false;
    favClass = '';
    deleteBtn = '';
    favBtn = '';
  }

  const hostName = story.getHostName();

  return $(`
      <li id="${story.storyId}">
        ${favBtn}
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username} ${deleteBtn}</small>
      </li>
    `).addClass(favClass).attr('data-favorited', favorited.toString());
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

// Retrieves data for story from submission form, post it to API, prepend response Story to local storyList memory
async function submitNewStory(e){
  console.debug("submitNewStory");
  e.preventDefault();
  const storyData = {
    title: $submitForm.get()[0].title.value,
    author: $submitForm.get()[0].author.value,
    url: $submitForm.get()[0].url.value
  }
  
  let newStory = await storyList.addStory(currentUser, storyData);
  // TO-DO, handle bad requests (Code 400 from server)
  // Manually add the new story to local memory (saves on requests to API)
  storyList.stories.unshift(newStory);
  currentUser.ownStories.push(newStory);
  
  // Update DOM
  $submitForm.trigger('reset');
  hidePageComponents();
  putStoriesOnPage();
}

$submitForm.on('submit', submitNewStory)


async function toggleUserFavorite(e){
  console.debug("toggleUserFavorite");
  e.preventDefault();
  const $storyLi = $(e.target.parentElement);
  const storyID = $storyLi.attr('id');
  const favorited = $storyLi.attr('data-favorited') === 'true';
  let method = favorited ? 'delete' : 'post';
  await currentUser.toggleFavorite(method, storyID);

  // update CSS
  updateFavoritedCSS($storyLi, favorited);
}

function updateFavoritedCSS($li, favorited){
  const $favSymbol = $li.children('span');
  let newSymbol = favorited ? '+' : '-';
  $favSymbol.toggleClass(['favorite-icon', 'favorite-icon-noHover']).text(newSymbol);
  $li.toggleClass('story-favorited');
  $li.attr('data-favorited', (!favorited).toString());
}

$allStoriesList.on('click', '.favSym', toggleUserFavorite);

function putFavoritesOnPage() {
  console.debug("putFavoritesOnPage");
  $allStoriesList.empty();

  // Nothing favorited?
  if (currentUser.favorites.length < 1){
    const $notification = $(
      '<b style="text-align: center">Try favoriting some stories first!</b>'
    )
    $allStoriesList.append($notification);
  } else {
    // loop through all stories in the currentUser's favorites and generate HTML for them
    for (let story of currentUser.favorites){
      const $story = generateStoryMarkup(story);
      $allStoriesList.append($story);
    }
  }

  $allStoriesList.show();
}

async function deleteStoryClick(e){
  await storyList.deleteStory(currentUser, e.target.id);
  storyList = await StoryList.getStories(); 
  currentUser = await User.syncUserInfo(currentUser, currentUser.loginToken);

  $(`li[id="${e.target.id}"]`).remove();
}

$allStoriesList.on('click', '.del', deleteStoryClick);