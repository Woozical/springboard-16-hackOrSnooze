"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.hide();

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

  let favBtn = '';
  let deleteBtn = '';
  let favClass = '';
  let favorited = false;
  let editBtn = '';

  if (currentUser){
    favorited = story.isFavoritedBy(currentUser);
    const owned = story.isOwnedBy(currentUser);
    const favSymbol = favorited ? '-' : '+';
    const favSymCSS = favorited ? 'favorite-icon-noHover' : 'favorite-icon';

    favClass = favorited ? 'story-favorited' : '';
    deleteBtn = owned ? `<small class="del" data-id="${story.storyId}">(delete)</small>` : '';
    favBtn = `<span class=" favSym ${favSymCSS}">${favSymbol}</span>`;
    editBtn = owned ? `<small class="edit" data-id="${story.storyId}">(edit)</small>` : '';
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
        <small class="story-user">posted by ${story.username} ${editBtn} ${deleteBtn}</small>
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
  try{
    let newStory = await storyList.addStory(currentUser, storyData);
    // TO-DO, handle bad requests (Code 400 from server)
    // Manually add the new story to local memory (saves on requests to API)
    storyList.stories.unshift(newStory);
    currentUser.ownStories.push(newStory);
    // Update DOM
    $submitForm.trigger('reset');
    hidePageComponents();
    putStoriesOnPage();
  } catch (err) {
    const $result = $('#submit-result');
    let code;
    try {
      code = err.response.status;
    } catch (e) {
      code = null;
    }
    switch(code){
      case (400):
        $result.text('A valid URL is required for all stories.\n(E.g. http://example.com)');
        break;
      case (401):
        $result.text('Error: You must be logged in to submit a story.');
        break;
      default:
        $result.text('Error: Could not reach API at this time.');
        break;
    }
    $result.show();
  }
}

$submitForm.on('submit', submitNewStory)


async function toggleUserFavorite(e){
  console.debug("toggleUserFavorite");
  e.preventDefault();
  const $storyLi = $(e.target.parentElement);
  const storyID = $storyLi.attr('id');
  const favorited = $storyLi.attr('data-favorited') === 'true';
  let method = favorited ? 'delete' : 'post';
  try {
    await currentUser.toggleFavorite(method, storyID);
    // update CSS
    updateFavoritedCSS($storyLi, favorited);
  } catch (err) {
    let code;
    try {
      code = err.response.status;
    } catch (e) {
      code = null;
    }
    switch(code){
      case (401):
        alert('You must be logged in to favorite stories');
        break;
      case (404):
        alert('Error: The story you are trying to favorite could not be located.');
        break;
      default:
        alert('Error: Could not reach API at this time.');
        break;
    }
  }
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
  const $target = $(e.target);
  const storyId = $target.attr('data-id');
  try{
    await storyList.deleteStory(currentUser, storyId);
    storyList = await StoryList.getStories(); 
    currentUser = await User.syncUserInfo(currentUser, currentUser.loginToken);
    $(`#${storyId}`).remove();
  } catch (err) {
    let code;
    try {
      code = err.response.status;
    } catch (e) {
      code = null;
    }
    switch(code){
      case (404):
        alert('Error: The story you are trying to delete could not be located.');
        break;
      case (403):
        alert('Error: You do not have permission to delete that story.');
        break;
      case (401):
        alert('Error: You must be logged in to delete your stories.');
        break;
      default:
        alert('Error: Could not reach API at this time.');
        break;
    }
  }
}

$allStoriesList.on('click', '.del', deleteStoryClick);

function editStoryClick(e){
  const $target = $(e.target);
  const storyId = $target.attr('data-id');
  hidePageComponents();
  openEditForm(storyId);
  e.preventDefault();
}

async function openEditForm(storyId){
  const story = await Story.getData(storyId);
  const form = $editForm.get()[0];
  $editForm.attr('data-editId', storyId);
  form.title.value = story.title;
  form.author.value = story.author;
  form.url.value = story.url;
  $editForm.show();
}

$allStoriesList.on('click', '.edit', editStoryClick);

async function submitEditForm(e){
  e.preventDefault();
  const form = $editForm.get()[0];
  const storyId = $editForm.attr('data-editId');
  const storyData = {
    title : form.title.value,
    author : form.author.value,
    url :form.url.value,
  };
  try{
    const editedStory = await storyList.editStory(currentUser, storyId, storyData);
    const editIdx = storyList.getStoryIndexById(storyId);
    storyList.stories[editIdx] = editedStory;
    // Update DOM
    $editForm.trigger('reset');
    hidePageComponents();
    putStoriesOnPage();
  } catch (err) {
    const $result = $('#edit-result');
    let code;
    try {
      code = err.response.status;
    } catch (e) {
      code = null;
    }
    switch(code){
      case (404):
        $result.text('Error: The story you are trying to edit could not be located.');
        break;
      case (403):
        $result.text('Error: You may only edit your own stories.');
        break;
      case (401):
        $result.text('Error: You must be logged in to edit your stories.');
        break;
      case (400):
        $result.text('A valid URL is required for all stories.\n(E.g. http://example.com).');
        break;
      default:
        $result.text('Error: Could not reach the API at this time.');
    }
    $result.show();
  }
}

$editForm.on('submit', submitEditForm);