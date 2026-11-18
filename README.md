# FoodieHub

FoodieHub is a responsive food-ordering website built with HTML, CSS, and vanilla JavaScript. It uses Firebase Authentication and Firestore for account and order features.

## Run locally

From the project directory, start a local web server:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy with Netlify

This is a static site; `netlify.toml` configures the repository root as the publish directory, with no build command required.

1. Sign in to [Netlify](https://app.netlify.com/) and choose **Add new site** → **Import an existing project**.
2. Connect GitHub and select this repository and the `main` branch.
3. Keep the publish directory as `.` and leave the build command empty, then deploy.
4. In Firebase Console → Authentication → Settings → Authorized domains, add the site's exact `your-site-name.netlify.app` hostname (without `https://`). Add any custom domain there too.

## Firebase setup

The Firebase web-app configuration is in `js/firebase-config.js`. In the Firebase console, enable the Authentication sign-in methods and set up Firestore and Storage for the features you want to use. Configure restrictive Firebase Security Rules before using real user data.

If the `foodItems` collection is empty or unavailable, the site displays a built-in sample menu. Sample items can be browsed and added to the cart, but must be added to Firestore before checkout can place orders.

Firebase web-app config values are included in client-side code; they are not server credentials. Never add Firebase Admin service-account keys or other private credentials to this repository.
