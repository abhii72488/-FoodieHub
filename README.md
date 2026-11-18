# FoodieHub

FoodieHub is a responsive food-ordering website built with HTML, CSS, and vanilla JavaScript. It uses Firebase Authentication and Firestore for account and order features.

## Run locally

From the project directory, start a local web server:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>.

## Firebase setup

The Firebase settings in `js/firebase-config.js` are placeholders. To enable authentication and database features:

1. Create a Firebase project and register a web app.
2. Replace the placeholder values in `js/firebase-config.js` with that app's configuration.
3. Enable the Firebase Authentication sign-in methods and configure Firestore for the features you want to use.

Do not add Firebase Admin service-account keys or other private credentials to this repository.
