const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { fyersModel } = require("fyers-api-v3");
const path = require("path");

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// FYERS API Configurations
const fyers = new fyersModel();
const APP_ID = "G1OJ34Z7OL-100"; // Your App ID
const SECRET_KEY = "QMO5UJN1M2"; // Your Secret Key
const REDIRECT_URL = "https://www.google.co.in/";

fyers.setAppId(APP_ID);
fyers.setRedirectUrl(REDIRECT_URL);

let accessToken = null;

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (!accessToken) {
    return res.redirect("/login");
  }
  next();
};

// Routes
app.get("/", (req, res) => {
  if (!accessToken) {
    // Serve the login page if the user is not authenticated
    res.sendFile(path.join(__dirname, "login.html"));
  } else {
    res.redirect("/dashboard");
  }
});

// Login Route
app.get("/login", (req, res) => {
  // Construct the authentication URL manually
  const authURL = `https://api.fyers.in/api/v2/generate-authcode?client_id=${APP_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URL
  )}&response_type=code&state=custom_state`;

  console.log("Redirecting to FYERS login page:", authURL); // Debugging log
  res.redirect(authURL); // Redirect user to FYERS login page
});

// Auth Callback Route
app.get("/auth-callback", async (req, res) => {
  const { auth_code, state } = req.query;

  console.log("Auth code received:", auth_code); // Debugging log

  if (!auth_code) {
    return res.status(400).send("Error: Authorization code not provided.");
  }

  try {
    const response = await fyers.generate_access_token({
      auth_code,
      secret_key: SECRET_KEY,
    });

    console.log("Access token response:", response); // Debugging log

    if (response.access_token) {
      accessToken = response.access_token;
      fyers.setAccessToken(accessToken);
      res.redirect("/dashboard");
    } else {
      throw new Error("Access token generation failed.");
    }
  } catch (error) {
    console.error("Error during token generation:", error);
    res.status(500).send("Failed to generate access token. Please try again.");
  }
});

// Dashboard Route
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Check Authentication
app.get("/check-auth", (req, res) => {
  res.json({ isAuthenticated: !!accessToken });
});

// Fetch Profile, Positions, Holdings, Orders
app.get("/profile", isAuthenticated, async (req, res) => {
  try {
    const profile = await fyers.get_profile();
    res.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).send({ error: "Failed to fetch profile." });
  }
});

app.get("/positions", isAuthenticated, async (req, res) => {
  try {
    const positions = await fyers.get_positions();
    res.json(positions);
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).send({ error: "Failed to fetch positions." });
  }
});

app.get("/holdings", isAuthenticated, async (req, res) => {
  try {
    const holdings = await fyers.get_holdings();
    res.json(holdings);
  } catch (error) {
    console.error("Error fetching holdings:", error);
    res.status(500).send({ error: "Failed to fetch holdings." });
  }
});

app.get("/orders", isAuthenticated, async (req, res) => {
  try {
    const orders = await fyers.get_orders();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send({ error: "Failed to fetch orders." });
  }
});

// Place Order
app.post("/place-order", isAuthenticated, async (req, res) => {
  const { symbol, qty, type, price, order_type } = req.body;

  const orderDetails = {
    symbol,
    qty: parseInt(qty),
    type: type.toUpperCase(),
    price: parseFloat(price),
    order_type: order_type.toUpperCase(),
    productType: "CNC",
    validity: "DAY",
    disclosedQty: 0,
    offlineOrder: "false",
  };

  try {
    const response = await fyers.place_order(orderDetails);
    res.json(response);
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send({ error: "Failed to place the order." });
  }
});

// Manual Access Token Entry
app.get("/manual-token", (req, res) => {
  res.sendFile(path.join(__dirname, "manual-token.html"));
});

app.post("/set-token", (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).send("Error: Access token not provided.");
  }
  accessToken = access_token;
  fyers.setAccessToken(accessToken);
  res.redirect("/dashboard");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});