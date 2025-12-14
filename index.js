const express = require('express')
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;

const stripe = require('stripe')(process.env.STRIPE_SECRET);

const admin = require("firebase-admin");

const serviceAccount = require(process.env.SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(express.json());
app.use(cors());

const verifyFirebaseToken = async (req, res, next) => {

  const token = req.headers?.authorization;
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized Access' })
  }

  try {
    const tokenId = token.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(tokenId);

    req.email = decoded.email;
    next();
  }
  catch (err) {
    res.status(401).send({ message: 'Unauthorized Access' })

  }

}



const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.pvc0uxo.mongodb.net/?appName=Cluster0`;



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {

    await client.connect();


    const database = client.db("scholar-stream");
    const usersCollection = database.collection("users");
    const scholarshipsCollection = database.collection("scholarships");
    const applicationsCollection = database.collection("applications");
    const reviewsCollection = database.collection("reviews");

    // (Verify Admin before allowing admin activity)
    const verifyAdmin = async (req, res, next) => {
      // Decoded email from verifyFirebaseTOken.
      const email = req.email;
      const query = { email };
      const user = await userCollection.findOne(query);

      if (!user || user.role !== 'Admin') {
        return res.status(403).send({ message: 'Forbidden Access' });
      }

      next();
    }


    // Users Related API

    app.get('/users', verifyFirebaseToken, async (req, res) => {

      const cursor = usersCollection.find();
      const users = await cursor.toArray();
      res.send(users);

    })


    app.get('/users/:email/role', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      res.send({ role: user?.role || 'User' })
    });




    // Scholarships Related API
    app.get('/scholarships', async (req, res) => {

      const cursor = scholarshipsCollection.find().project({
        _id: 1,
        scholarshipName: 1,
        universityName: 1,
        universityImage: 1,
        universityCountry: 1,
        universityCity: 1,
        subjectCategory: 1,
        scholarshipCategory: 1,
        applicationFees: 1,
        applicationDeadline: 1,
        scholarshipLevel: 1,
      });
      const result = await cursor.toArray();
      res.send(result);

    })

    app.get('/top-scholarships', async (req, res) => {
      const cursor = scholarshipsCollection.find()
        .sort({ scholarshipPostDate: -1 })
        .limit(6)
        .project({
          _id: 1,
          scholarshipName: 1,
          universityName: 1,
          universityImage: 1,
          universityCountry: 1,
          universityCity: 1,
          subjectCategory: 1,
          scholarshipCategory: 1,
          applicationFees: 1,
          applicationDeadline: 1,
          scholarshipLevel: 1,

        });
      const result = await cursor.toArray();
      res.send(result);
    })



    app.get('/scholarship/:id', verifyFirebaseToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipsCollection.findOne(query);
      res.send(result);
    })


    // Payment Related Api
    app.post('/checkout', async (req, res) => {

      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.price) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'USD',
              unit_amount: amount,
              product_data: {
                name: `PLEASE PAY FOR : ${paymentInfo.parcelName}`,

              },

            },
            quantity: 1,
          },
        ],

        mode: 'payment',
        metadata: {
          id: paymentInfo.id,
          parcelName: paymentInfo.parcelName,
          trackingId: paymentInfo.trackingId

        },
        customer_email: paymentInfo.senderEmail,
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancelled`,
      });

      console.log(session)
      res.send({ url: session.url })
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Schola Stream Server is running!')
})

app.listen(port, () => {
  console.log(`Scholar stream app listening on port ${port}`)
})
