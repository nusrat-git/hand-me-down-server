const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.User_Name}:${process.env.User_Password}@cluster0.rydkcco.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.get('/', (req, res) => {
  res.send('Hand Me Down server running')
})

async function run() {
  try {

    const productsDatabase = client.db('handMeDown').collection('products');
    const categoriesDatabase = client.db('handMeDown').collection('category');

    app.get('/homeProducts', async (req, res) => {
      const query = {};
      const cursor = productsDatabase.find(query).sort({ time: -1 }).limit(3);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/homeCategory', async (req, res) => {
      const query = {};
      const cursor = categoriesDatabase.find(query).sort({time: -1}).limit(3);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/products', async (req, res) => {
      const product = req.body;
      const result = await productsDatabase.insertOne(product);
      product.id = result.insertedId;
      res.send(result);
    })

    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productsDatabase.find(query).sort({time: -1});
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/categories', async (req, res) => {
      const category = req.body;
      const result = await categoriesDatabase.insertOne(category);
      category.id = result.insertedId;
      res.send(result);
    })

    app.get('/categories', async (req, res) => {
      const query = {};
      const cursor = categoriesDatabase.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

  }
  finally {

  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Hand me down server listening on port ${port}`)
})