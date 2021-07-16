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
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();
  const favorited = isStoryFavorited(story.storyId);
  const favSymbol = favorited ? '-' : '+';
  const favClass = favorited ? 'story-favorited' : '';
  const favSymCSS = favorited ? 'favorite-icon-noHover' : 'favorite-icon';
  const deleteBtn = isStoryOwned(story.storyId) ? `<small class="del" id="${story.storyId}">(delete)</small>` : '';
  return $(`
      <li id="${story.storyId}">
        <span class=" favSym ${favSymCSS}">${favSymbol}</span>
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username} ${deleteBtn}</small>
      </li>
    `).addClass(favClass);
}

function isStoryFavorited(storyId){
  for (let favStory of currentUser.favorites){
    if (favStory.storyId === storyId) return true;
  }
  return false;
}

function isStoryOwned(storyId){
  for (let story of currentUser.ownStories){
    if (story.storyId === storyId) return true;
  }
  return false;
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
  const favorited = isStoryFavorited(storyID) 
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

function deleteStoryClick(e){
  console.log('Baleeting:', e.target.id);
}

$allStoriesList.on('click', '.del', deleteStoryClick);