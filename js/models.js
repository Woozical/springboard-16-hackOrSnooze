"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";
const timeout = 10000; // Global timeout of 10 seconds for all requests

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  // Makes a request to the API for data about a specific story
  // Note that this returns a generic OBJ {} and should be converted to a new Story() if saved.
  static async getData(id) {
    const response = await axios({
      url: `${BASE_URL}/stories/${id}`,
      method: 'GET',
      timeout
    }
    );
    return response.data.story;
  }

  /** Parses hostname out of URL and returns it. */
  getHostName() {
    const parseUrl = new URL(this.url);
    return parseUrl.hostname;
  }

  // Checks to see if this story exists in the favorites list of the passed in user (currentUser)
  isFavoritedBy(user){
    for (let favStory of user.favorites){
      if (favStory.storyId === this.storyId) return true;
    }
    return false;
  }

  // Checks to see if this story exists in the ownStories list of the passed in user (currentUser)
  isOwnedBy(user){
    for (let ownStory of user.ownStories){
      if (ownStory.storyId === this.storyId) return true;
    }
    return false;
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
      timeout,
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user, newStory) {
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: 'post',
      timeout,
      data: {
        token: user.loginToken,
        story: newStory
      }
    });
    console.debug(response);
    return new Story(response.data.story);

  }

  // Sends a request to the API to delete the given story
  // Returns the ID of the deleted story
  async deleteStory(user, storyId){
    const response = await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: 'delete',
      timeout,
      data: {
        token: user.loginToken
      }
    });

    return (response.data.story.storyId);
  }

  // Sends a request to the API to edit the given story
  // Returns the edited version of that story as a Story instance
  async editStory(user, storyId, newData){
    const response = await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: 'patch',
      timeout,
      data: {
        token: user.loginToken,
        story: newData,}
    })

    console.debug(response);
    return new Story(response.data.story);
  }

  getStoryIndexById(id){
    return this.stories.findIndex(
      (story) => {
        return story.storyId === id;
      }
    )
  }

}


/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      timeout,
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      timeout,
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        timeout,
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  // Makes a request to the API for up-to-date information on the current user
  // Returns a new User instance with the updated information
  static async syncUserInfo(user){
    try{
      const response = await axios({
        url: `${BASE_URL}/users/${user.username}`,
        method: 'GET',
        timeout,
        params: { token: user.loginToken }
      });

      let newUser = response.data.user;
      console.debug('Sync successful');
      return new User(
        {
          username: newUser.username,
          name: newUser.name,
          createdAt: newUser.createdAt,
          favorites: newUser.favorites,
          ownStories: newUser.stories
        },
        token
      );
      } catch (err) {
        console.error('Synchronization failed', err);
        return null;
      }
  }

  // Makes a request to the API to add/remove a story from the user's favorites list
  // method, string - 'post' to add favorite, 'delete' to remove favoite
  async toggleFavorite(method, storyId){
    const endpoint = `${BASE_URL}/users/${this.username}/favorites/${storyId}`;
    const response = await axios({
      url: endpoint,
      method,
      timeout,
      data: {
        token : this.loginToken
      }
    })
    const updatedUser = response.data.user
    // Update local memory
    this.favorites = updatedUser.favorites.map(s => new Story(s));
    console.debug(response.data.message);
  }
}
