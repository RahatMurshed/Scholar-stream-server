const express = require('express')
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;

const stripe = require('stripe')(process.env.STRIPE_SECRET);

const admin = require("firebase-admin");

const serviceAccount = require('./scholar-stream-firebase-admin-sdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(express.json());
app.use(cors());

const verifyFirebaseToken = async (req, res, next) => {

  const token = req.headers?.authorization;
  // console.log(token)
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
      const user = await usersCollection.findOne(query);

      if (!user || user.role !== 'Admin') {
        return res.status(403).send({ message: 'Forbidden Access' });
      }

      next();
    }
    // Verify Moderator
    const verifyModerator = async (req, res, next) => {
      // Decoded email from verifyFirebaseTOken.
      const email = req.email;
      const query = { email };
      const user = await usersCollection.findOne(query);

      if (!user || user.role !== 'Moderator') {
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


    app.get('/users/:email/role', verifyFirebaseToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user?.role || 'User' })
    });


    app.patch('/user/:id', verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const newRole = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          role: newRole.role
        }
      }

      const result = await usersCollection.updateOne(query, update);
      res.send(result);
    });


    app.post('/users', async (req, res) => {
      const userInfo = req.body;
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });

    app.delete('/user/:id', verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
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

    app.post('/scholarships', verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const newScholarship = req.body;
      const result = await scholarshipsCollection.insertOne(newScholarship);
      res.send(result);
    })

    app.patch('/scholarship/:id', verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const update = {
        $set: {
          scholarshipName: updatedData.scholarshipName,
          universityName: updatedData.universityName,
          subjectCategory: updatedData.subjectCategory,
          scholarshipCategory: updatedData.scholarshipCategory,
          scholarshipLevel: updatedData.scholarshipLevel,
          applicationFees: updatedData.applicationFees,
          applicationDeadline: updatedData.applicationDeadline,
          tuitionFees: updatedData.tuitionFees,
          serviceCharge: updatedData.serviceCharge,
          scholarshipStatus: updatedData.scholarshipStatus,




        }
      }
      const result = await scholarshipsCollection.updateOne(query, update);
      res.send(result);
    })

    app.delete('/scholarship/:id', verifyFirebaseToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipsCollection.deleteOne(query);
      res.send(result);
    })


    // Payment Related Api




    app.post('/checkout', verifyFirebaseToken, async (req, res) => {

      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.price) * 100;
      console.log(amount);
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'USD',
              unit_amount: amount,
              product_data: {
                name: `Please pay for : ${paymentInfo.scholarshipName}`,

              },

            },
            quantity: 1,
          },
        ],

        mode: 'payment',
        metadata: {
          id: paymentInfo.id,
          scholarshipName: paymentInfo.scholarshipName,
          customer_email: paymentInfo.customerEmail,


        },

        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancelled`,
      });

      console.log(session)
      res.send({ url: session.url })
    });


    app.patch('/payment-success', verifyFirebaseToken, async (req, res) => {
      const sessionId = req.query.session_id;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('session retrieve', session)


      const transectionId = session.payment_intent;




      if (session.payment_status === 'paid') {
        const id = session.metadata.id;
        const email = session.metadata.customer_email;
        const query = {
          scholarshipId: id,
          userEmail: email
        };

        const update = {
          $set: {
            paymentStatus: 'Paid',
            transectionId: transectionId
          }
        }

        console.log('id:', id)
        console.log('query:', query)
        const doc = await applicationsCollection.findOne(query);
        console.log("Matched document:", doc);




        const result = await applicationsCollection.updateOne(query, update);
        res.send(result);
      }

    })


    // Applications related api


    app.get('/applications', verifyFirebaseToken, verifyModerator, async (req, res) => {
      const result = await applicationsCollection.find().sort({ applicationDate: -1 }).toArray();
      res.send(result);
    });

    app.get('/my-applications', async (req, res) => {
      const { email } = req.query;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const cursor = applicationsCollection.find(query).sort({ applicationDate: -1 })
      const result = await cursor.toArray();
      res.send(result);

    })

    app.post('/application', verifyFirebaseToken, async (req, res) => {
      const applicationInfo = req.body;
      const query = {
        scholarshipId: applicationInfo.scholarshipId,
        userEmail: applicationInfo.userEmail

      }

      const applicationExists = await applicationsCollection.findOne(query);

      if (applicationExists) {
        return res.send({ message: 'Data already exists! Try another scholarship.' })
      }
      const result = await applicationsCollection.insertOne(applicationInfo);
      res.send(result);
    });


    app.patch('/application/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedData = req.body;
      const update = {
        $set: {
          userName: updatedData.userName,
          userEmail: updatedData.userEmail,
          contact: updatedData.contact
        }
      }
      const result = await applicationsCollection.updateOne(query, update);
      res.send(result);
    })


    app.patch('/application/:id/feedback', verifyFirebaseToken, verifyModerator, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const update = {
        $set: {
          feedback: updatedData.feedback
        }
      }
      const result = await applicationsCollection.updateOne(query, update);
      res.send(result);
    });


    app.patch('/application/:id/status', verifyFirebaseToken, verifyModerator, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = req.body;
      const update = {
        $set: {
          applicationStatus: updatedData.applicationStatus
        }
      }
      const result = await applicationsCollection.updateOne(query, update);
      res.send(result);
    });


    app.delete('/application/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await applicationsCollection.deleteOne(query);
      res.send(result);
    });


    //  Review related api

    app.get('/reviews', async (req, res) => {
      const email = req.query.email;
      const query = {};
      if (email) {
        query.userEmail = email;
      }
      const result = await reviewsCollection.find(query).sort({ reviewDate: -1 }).toArray();
      res.send(result);
    })


    app.post('/reviews', async (req, res) => {
      const newReview = req.body;
      const result = await reviewsCollection.insertOne(newReview);
      res.send(result);
    });


    app.patch('/reviews/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedData = req.body;
      const update = {
        $set: {
          ratingPoint: updatedData.ratingPoint,
          reviewComment: updatedData.reviewComment
        }
      }

      const result = await reviewsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete('/reviews/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await reviewsCollection.deleteOne(query);
      res.send(result);
    })




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
