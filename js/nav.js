"use strict";

/******************************************************************************
 * Handling navbar clicks and updating navbar
 */

/** Show main list of all stories when click site name */

function navAllStories(evt) {
  console.debug("navAllStories", evt);
  hidePageComponents();
  putStoriesOnPage();
}

$body.on("click", "#nav-all", navAllStories);

/** Show login/signup on click on "login" */

function navLoginClick(evt) {
  console.debug("navLoginClick", evt);
  hidePageComponents();
  $loginForm.show();
  $signupForm.show();
}

$navLogin.on("click", navLoginClick);

/** When a user first logins in, update the navbar to reflect that. */

function updateNavOnLogin() {
  console.debug("updateNavOnLogin");
  $(".main-nav-links").show();
  $navLogin.hide();
  $navLogOut.show();
  $navUserProfile.text(`${currentUser.username}`).show();
  $navFavorites.show();
  $navSubmit.show();
}

// Open the new story submission form when clicking "submit"
function navSubmitClick(evt){
  console.debug("navSubmitClick", evt);
  hidePageComponents();
  evt.preventDefault();
  $submitForm.show();
}
$navSubmit.on("click", navSubmitClick);
// Display the currentUser's favorites in the list of stories
function navFavoriteClick(evt){
  console.debug("navFavoriteClick", evt);
  hidePageComponents();
  putUserStoriesOnPage('favorites');
}
$navFavorites.on("click", navFavoriteClick);
// Display the currentUser's own stories when clicking on their profile name
function navUserClick(evt){
  console.debug("navUserClick", evt);
  hidePageComponents();
  putUserStoriesOnPage('ownStories');
}

$navUserProfile.on("click", navUserClick);