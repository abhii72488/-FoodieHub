# FoodieHub

FoodieHub is a responsive food-ordering website built with HTML, CSS, and vanilla JavaScript. It uses Firebase Authentication and Firestore for account and order features.

## Run locally

From the project directory, start a local web server:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>.

## Firebase setup

The Firebase web-app configuration is in `js/firebase-config.js`. In the Firebase console, enable the Authentication sign-in methods and set up Firestore and Storage for the features you want to use. Configure restrictive Firebase Security Rules before using real user data.

Firebase web-app config values are included in client-side code; they are not server credentials. Never add Firebase Admin service-account keys or other private credentials to this repository.
