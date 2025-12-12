const express = require('express')
const app = express();
const cors = require('cors');
require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');
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


    const database = client.db("scholarStream");
    const usersCollection = database.collection("users");
    const scholarshipsCollection = database.collection("scholarships");
    const applicationsCollection = database.collection("applications");
    const reviewsCollection = database.collection("reviews");




    app.get('/users', async (req, res) => {

      const cursor = usersCollection.find();
      const users = await cursor.toArray();
      res.send(users);

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
