const baseConfig = require("./app.json");

const expo = baseConfig.expo ?? {};
const android = expo.android ?? {};

module.exports = {
  expo: {
    ...expo,
    name: process.env.APP_DISPLAY_NAME || expo.name,
    version: process.env.APP_VERSION_NAME || expo.version,
    android: {
      ...android,
      package: process.env.APP_APPLICATION_ID || android.package,
    },
    extra: {
      ...(expo.extra || {}),
      stylingApiUrl: process.env.EXPO_PUBLIC_STYLING_API_URL || "",
      buildVariant: process.env.APP_BUILD_VARIANT || "",
    },
  },
};
