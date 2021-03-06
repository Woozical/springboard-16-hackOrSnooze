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
  // Mark up varies on if the user is logged in, and if that story's relation to the user
  if (currentUser){
    favorited = story.isFavoritedBy(currentUser);
    const owned = story.isOwnedBy(currentUser);
    // Change favorite button based on current favorite status
    const favSymbol = favorited ? '-' : '+';
    const favSymCSS = favorited ? 'favorite-icon-noHover' : 'favorite-icon';

    // Highlight the entire entry if favorited
    favClass = favorited ? 'story-favorited' : '';
    // Append a delete button if the story is one of the user's
    deleteBtn = owned ? `<small class="del" data-id="${story.storyId}">(delete)</small>` : '';
    // Append a favorite toggle button if logged in
    favBtn = `<span class=" favSym ${favSymCSS}">${favSymbol}</span>`;
    // Append a edit button if the story is one of the user's
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
  storyDisplay = STATE.all;
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
    // Manually add the new story to local memory (saves on requests to API)
    storyList.stories.unshift(newStory);
    currentUser.ownStories.push(newStory);
    // Update DOM
    $submitForm.trigger('reset');
    hidePageComponents();
    switch (storyDisplay){
      case STATE.own:
        putUserStoriesOnPage('ownStories');
        break;
      default:
        putStoriesOnPage();
    }
  // Error Handling
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

// Adds/Removes clicked story element to the user's favorites list
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
// For use in favorite click handler
function updateFavoritedCSS($li, favorited){
  const $favSymbol = $li.children('span');
  let newSymbol = favorited ? '+' : '-';
  $favSymbol.toggleClass(['favorite-icon', 'favorite-icon-noHover']).text(newSymbol);
  $li.toggleClass('story-favorited');
  $li.attr('data-favorited', (!favorited).toString());
}

// Displays the favorited or owned stories of the currentUser object
// key is a string that must equal 'favorites' or 'ownStories'
function putUserStoriesOnPage(key) {
  console.debug("putUserStoriesOnPage", key);
  $allStoriesList.empty();
  const favMode = (key === 'favorites');
  // Nothing favorited or created?
  if (currentUser[key].length < 1){
    const verb = favMode ? 'favoriting' : 'creating';
    const $notification = $(
      `<b style="text-align: center">No stories to list... try ${verb} some!</b>`
    )
    $allStoriesList.append($notification);
  } else {
    // loop through all stories in the currentUser's favorites/ownStories and generate HTML for them
    for (let story of currentUser[key]){
      const $story = generateStoryMarkup(story);
      $allStoriesList.append($story);
    }
  }
  storyDisplay = favMode ? STATE.fav : STATE.own;
  $allStoriesList.show();
}

// Click handler for deleting a user's own story
async function deleteStoryClick(e){
  const $target = $(e.target);
  const storyId = $target.attr('data-id');
  try{
    // Delete and sync local memory with API
    await storyList.deleteStory(currentUser, storyId);
    storyList = await StoryList.getStories(); 
    currentUser = await User.syncUserInfo(currentUser);
    $(`#${storyId}`).remove();
    // Notification is user deletes all of their stories while viewing their own story list
    if (storyDisplay === STATE.own && currentUser.ownStories.length === 0){
      const $notification = $(
        `<b style="text-align: center">No stories to list... try creating some!</b>`
      )
      $allStoriesList.append($notification);
    }
  // Error handling
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

// Click handler for clicking on the edit story button
function editStoryClick(e){
  const $target = $(e.target);
  const storyId = $target.attr('data-id');
  hidePageComponents();
  openEditForm(storyId);
  e.preventDefault();
}

// Displays the edit form and populates its field with info about the clicked story.
function openEditForm(storyId){
  const story = storyList.stories[storyList.getStoryIndexById(storyId)];
  const form = $editForm.get()[0];
  $editForm.attr('data-editId', storyId);
  form.title.value = story.title;
  form.author.value = story.author;
  form.url.value = story.url;
  $editForm.show();
}

// Submit handler for story edit form
async function submitEditForm(e){
  e.preventDefault();
  // Retrieve data from form
  const form = $editForm.get()[0]; // Convert to HTMLElement for shorter syntax in accessing input fields
  const storyId = $editForm.attr('data-editId');
  const storyData = {
    title : form.title.value,
    author : form.author.value,
    url :form.url.value,
  };

  try{
    const editedStory = await storyList.editStory(currentUser, storyId, storyData);

    // Find and replace old story in local memory of storyList
    const editIdx = storyList.getStoryIndexById(storyId);
    const oldStory = storyList.stories[editIdx];
    storyList.stories[editIdx] = editedStory;
    // Find and replace old story in local memory of owned stories
    const ownEditIdx = currentUser.ownStories.findIndex(
      (story) => {
        return (story.storyId === oldStory.storyId);
      }
    );
    currentUser.ownStories[ownEditIdx] = editedStory;
    // Find and replace old story in local memory of favorited stories (if favorited)
    if (oldStory.isFavoritedBy(currentUser)){
      const favEditIdx = currentUser.favorites.findIndex(
        (story) => {
          return (story.storyId === oldStory.storyId);
        }
      );
      currentUser.favorites[favEditIdx] = editedStory;
    }

    // Update DOM
    $editForm.trigger('reset');
    hidePageComponents();
    switch (storyDisplay){
      case STATE.fav:
        putUserStoriesOnPage('favorites');
        break;
      case STATE.own:
        putUserStoriesOnPage('ownStories');
        break;
      default:
        putStoriesOnPage();
    }
    //Error Handling
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
// Add Event Handlers
$editForm.on('submit', submitEditForm);
$submitForm.on('submit', submitNewStory);
$allStoriesList.on('click', '.edit', editStoryClick);
$allStoriesList.on('click', '.del', deleteStoryClick);
$allStoriesList.on('click', '.favSym', toggleUserFavorite);
