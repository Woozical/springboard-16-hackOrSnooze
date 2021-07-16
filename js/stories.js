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
  const favSymbol = isStoryFavorited(story.storyId) ? '-' : '+';
  return $(`
      <li id="${story.storyId}">
        <span class="favorite-icon">${favSymbol}</span>
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
}

function isStoryFavorited(storyId){
  for (let favStory of currentUser.favorites){
    if (favStory.storyId === storyId) return true;
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
  e.preventDefault();
  const $storyLi = $(e.target.parentElement);
  const storyID = $storyLi.attr('id');
  const favorited = isStoryFavorited(storyID) 
  let method = favorited ? 'delete' : 'post';
  let newSymbol = favorited ? '+' : '-';
  await currentUser.toggleFavorite(method, storyID);
  e.target.innerText = newSymbol;
}

$allStoriesList.on('click', '.favorite-icon', function(e){
  toggleUserFavorite(e);
})