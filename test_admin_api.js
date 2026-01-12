const axios = require("axios");

// Test token - you'll need to replace this with a valid token from the frontend
const testAdminAPI = async () => {
  try {
    // First, let's get a valid token by checking what's in the database
    const response = await axios.get("https://digitallifelessonsa11.web.app/api/admin/stats", {
      headers: {
        Authorization: "Bearer test_token_here",
      },
    });
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log("Error status:", error.response.status);
      console.log("Error data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error:", error.message);
    }
  }
};

testAdminAPI();
