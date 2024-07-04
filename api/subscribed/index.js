const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

// Utility function to add delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

router.get("/", async (req, res) => {
  const fid = req.query.fid;
  if (!fid) {
    return res.status(400).send("Missing fid");
  }

  try {
    const subscribed_to_response = await axios.get(
      `https://api.neynar.com/v2/farcaster/user/subscribed_to?fid=${fid}&viewer_fid=${fid}&subscription_provider=fabric_stp`,
      {
        headers: {
          api_key: process.env.NEYNAR_API_KEY, // Ensure the API key is a string
        },
      }
    );

    if (subscribed_to_response.data) {
      const creators = subscribed_to_response.data.subscribed_to.map(
        (subscribe_to) => {
          return subscribe_to.creator;
        }
      );

      // Keep track of contract addresses
      const subscribed_to_contract_addresses =
        subscribed_to_response.data.subscribed_to.reduce(
          (acc, subscribe_to) => {
            acc[subscribe_to.contract_address] = subscribe_to;
            return acc;
          },
          {}
        );

      // Get subscribers of creators with delay to handle rate limit
      const subscribers = await Promise.all(
        creators.map(async (creator, index) => {
          await delay(200); // Delay each request by 200ms times the index
          try {
            const subscribers_response = await axios.get(
              `https://api.neynar.com/v2/farcaster/user/subscribers?fid=${creator.fid}&viewer_fid=${fid}&subscription_provider=fabric_stp`,
              {
                headers: {
                  api_key: process.env.NEYNAR_API_KEY, // Ensure the API key is a string
                },
              }
            );
            return subscribers_response.data.subscribers.filter(
              (subscriber) =>
                subscriber.user.fid !== Number(fid) &&
                subscriber.user.viewer_context.following
            );
          } catch (error) {
            return []; // Return an empty array on error
          }
        })
      );

      // Combine subscribers into one array and filter the original fid
      const all_subscribers = subscribers.flat();

      // Get subscribed_to for all_subscribers with delay to handle rate limit
      const all_subscribers_subscribed_to = await Promise.all(
        all_subscribers.map(async (subscriber, index) => {
          await delay(300); // Delay each request by 200ms times the index
          try {
            const subscribed_to_response = await axios.get(
              `https://api.neynar.com/v2/farcaster/user/subscribed_to?fid=${subscriber.user.fid}&viewer_fid=${fid}&subscription_provider=fabric_stp`,
              {
                headers: {
                  api_key: process.env.NEYNAR_API_KEY, // Ensure the API key is a string
                },
              }
            );
            // Remove results that are in subscribed_to_contract_addresses
            return subscribed_to_response.data.subscribed_to.filter(
              (subscribed_to) =>
                !subscribed_to_contract_addresses[
                  subscribed_to.contract_address
                ]
            );
          } catch (error) {
            return []; // Return an empty array on error
          }
        })
      );

      // Flatten the array and count occurrences of each contract address
      const contract_address_counts = all_subscribers_subscribed_to
        .flat()
        .reduce((acc, subscribed_to) => {
          acc[subscribed_to.contract_address] = acc[
            subscribed_to.contract_address
          ] || {
            count: 0,
            subscribed_to: subscribed_to,
          };
          acc[subscribed_to.contract_address].count += 1;
          return acc;
        }, {});

      // Convert the counts object to an array and sort by count in descending order
      const sorted_contract_addresses = Object.values(contract_address_counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Return the top 10 contract addresses with their full subscribed_to object
      return res.json(
        sorted_contract_addresses.map((entry) => entry.subscribed_to)
      );
    } else {
      return res.status(404).send("No subscribed to data found");
    }
  } catch (error) {
    return res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
