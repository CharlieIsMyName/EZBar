# EZBar
A webapp built with full stack javascript that helps the user finding bars around searched areas and find others to go together

# Usage - How to run the server
node server.js [cookie_secret] [mongodb_path]


The cookie secret is a secret string that is used for cookie encryption. Should not be public.
This app require the mongodb to contain two collections - "ezbar-login" and "ezpoll-data".

The app must also contain a key.json file, which have the YELP key information in the following format since this app have used YELP API.

{

  "consumer_key": "a",
  
  "consumer_secret": "b",
  
  "token": "c",
  
  "token_secret": "d"
  
}


#Project information

-Currently depolyed on https://ezbar.herokuapp.com/


-Original project requirement: https://www.freecodecamp.com/challenges/build-a-nightlife-coordination-app


-Many thanks to YELP API to make this project possible.
