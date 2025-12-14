const express = require('express')
const app = express();
const cors = require('cors');
require('dotenv').config();

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000;


// middleware
app.use(express.json());
app.use(cors());




// scholar-stream
// 2eGGJxywApjdFoKs

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




    // Users Related API

    app.get('/users', async (req, res) => {

      const cursor = usersCollection.find();
      const users = await cursor.toArray();
      res.send(users);

    })


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
        scholarshipCategory : 1,
        applicationFees: 1,
        applicationDeadline: 1,
        scholarshipLevel: 1,
       });
      const result = await cursor.toArray();
      res.send(result);
      
    })

    app.get('/top-scholarships', async (req, res) => {
      const cursor = scholarshipsCollection.find()
      .sort({scholarshipPostDate: -1})
      .limit(6)
      .project({ 
        _id: 1,
        scholarshipName: 1,
        universityName: 1,
        universityImage: 1,
        universityCountry: 1,
        universityCity: 1,
        subjectCategory: 1,
        scholarshipCategory : 1,
        applicationFees: 1,
        applicationDeadline: 1,
        scholarshipLevel: 1,
        
       });
      const result = await cursor.toArray();
      res.send(result);
    })

      

    app.get('/scholarships/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipsCollection.findOne(query);
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
