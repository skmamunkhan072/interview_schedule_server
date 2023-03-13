const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

// // mongodb url
const uri = process.env.MONGODB_URL;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify jwt token function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const AllUserCollection = client
      .db("interview_schedule_server")
      .collection("all-user");
    const AllInterviewTimeSlodeCollection = client
      .db("interview_schedule_server")
      .collection("interview_schedule");
    const AllInterviewscheduleDataCollection = client
      .db("interview_schedule_server")
      .collection("all-interview_schedule-data");
    const AllInterviewBookingCollection = client
      .db("interview_schedule_server")
      .collection("all-interview_booking-data");

    app.put("/create-user-database", async (req, res) => {
      const user = req.body;
      const { email } = user;
      const userResult = await AllUserCollection.findOne({ email });
      if (userResult) {
        if (user?.email === email) {
          return res.send({ messge: "this email is all ready use" });
        }
      }
      const result = await AllUserCollection.insertOne(user);
      res.send(result);
    });

    // Jwt token crate function
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const user = await AllUserCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // get currnt user
    app.get("/database-user", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const user = await AllUserCollection.findOne({ email });
      res.send({ role: user?.role });
    });

    // all-day-time-slode
    app.get("/all-day-time-slode", async (req, res) => {
      const allDayTimeSlode = await AllInterviewTimeSlodeCollection.find(
        {}
      ).toArray();
      res.send(allDayTimeSlode);
    });

    //all-interview-time-slode
    app.get("/all-interview-time-slode", async (req, res) => {
      const query = {};
      const result = await AllInterviewTimeSlodeCollection.find(
        query
      ).toArray();
      res.send(result);
    });

    // interview value change
    app.put("/interview-time-slode-value-change", async (req, res) => {
      const data = req.body;
      const { id } = data;
      const query = { _id: ObjectId(id) };
      const result = await AllInterviewTimeSlodeCollection.findOne(query);

      const options = { upsert: true };
      if (result?.value === true) {
        const updateDoc = {
          $set: {
            value: false,
          },
        };
        const timeSlodeValueUpdate =
          await AllInterviewTimeSlodeCollection.updateOne(
            query,
            updateDoc,
            options
          );

        return res.send(timeSlodeValueUpdate);
      } else {
        const updateDoc = {
          $set: {
            value: true,
          },
        };
        const timeSlodeValueUpdate =
          await AllInterviewTimeSlodeCollection.updateOne(
            query,
            updateDoc,
            options
          );
        return res.send(timeSlodeValueUpdate);
      }
    });

    // interview-Schedule-Data save databas
    app.put("/interview-schedule-data", async (req, res) => {
      const data = req.body;
      const oldData = await AllInterviewscheduleDataCollection.find(
        {}
      ).toArray();

      const options = { upsert: true };
      if (oldData?.length) {
        for (const singledata of oldData) {
          if (singledata?.currentMont === data?.currentMont) {
            return res.send({
              errorMessage: "tis mont is difind please delete and new find",
            });
          }
        }
      }
      const result = await AllInterviewscheduleDataCollection.insertOne(data);
      console.log(result);
      return res.send(result);
    });

    app.get("/all-interview-schedule-data", async (req, res) => {
      const result = await AllInterviewscheduleDataCollection.find(
        {}
      ).toArray();
      res.send(result);
    });

    app.delete("/interview-Mont-data-delete", async (req, res) => {
      const { id } = req.body;
      const query = { _id: ObjectId(id) };
      const result = await AllInterviewscheduleDataCollection.deleteOne(query);

      res.send(result);
    });

    // all interview booking data
    app.post("/booking-interview-date", async (req, res) => {
      const bookingData = req.body;
      const { bookingDate, bookingtime } = bookingData;
      const { email } = bookingData;
      const userResult = await AllInterviewBookingCollection.findOne({ email });
      if (userResult && userResult?.email === email) {
        return res.send({ messge: "this email is all ready use" });
      }
      const bookingCheck = await AllInterviewBookingCollection.findOne({
        bookingDate,
        bookingtime,
      });
      if (bookingCheck) {
        return res.send({ messge: "This time is All rady Bookd" });
      }
      console.log(bookingCheck);
      const result = await AllInterviewBookingCollection.insertOne(bookingData);
      res.send(result);
    });

    // user booking interview data
    app.get("/my-interview-booking-data", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const result = await AllInterviewBookingCollection.find({
        email,
      }).toArray();
      res.send(result);
    });
    app.delete("/my-interview-booking-data", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const result = await AllInterviewBookingCollection.deleteOne({
        email,
      });
      console.log(result);
      res.send(result);
    });

    app.get("/all-user", async (req, res) => {
      const allUser = await AllUserCollection.find({}).toArray();
      res.send(allUser);
    });
    app.put("/request-employer", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const query = { email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "requestEmployer",
        },
      };
      const requestEmployer = await AllUserCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(requestEmployer);
    });

    app.put("/employer-request-accept", verifyJWT, async (req, res) => {
      const email = req.decoded.email;
      const id = req.body;
      const adminUser = await AllUserCollection.findOne({ email });
      console.log(adminUser);
      if (adminUser?.role === "admin") {
        console.log("Hello");
        const query = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            role: "employer",
          },
        };
        const requestEmployer = await AllUserCollection.updateOne(
          query,
          updateDoc,
          options
        );
        return res.send(requestEmployer);
      }

      res.send({ message: "forbidden access" });
    });
  } finally {
  }
}

run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("interview_schedule_server  is running");
});

app.listen(port, () =>
  console.log(`interview_schedule_server  is running on ${port}`)
);
