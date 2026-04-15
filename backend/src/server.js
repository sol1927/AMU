import dotenv from "dotenv";
import app from "./app.js";
import mongoose from "mongoose";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const MONGO_RETRY_DELAY_MS = 5000;

let isConnecting = false;
let reconnectTimeout = null;

const clearReconnectTimeout = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
};

const scheduleReconnect = () => {
  if (isConnecting || reconnectTimeout) {
    return;
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToMongo();
  }, MONGO_RETRY_DELAY_MS);
};

const connectToMongo = async () => {
  if (!MONGO_URI || isConnecting || mongoose.connection.readyState === 1) {
    return;
  }

  isConnecting = true;
  clearReconnectTimeout();

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch {
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on("disconnected", () => {
  scheduleReconnect();
});

mongoose.connection.on("error", () => {
  scheduleReconnect();
});

app.listen(PORT, () => {
  connectToMongo();
});
