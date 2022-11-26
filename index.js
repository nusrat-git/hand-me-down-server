const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const e = require('express');
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


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Unauthorized access');
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.Access_token, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  })
}


async function run() {
  try {

    const productsDatabase = client.db('handMeDown').collection('products');
    const categoriesDatabase = client.db('handMeDown').collection('category');
    const usersDatabase = client.db('handMeDown').collection('users');
    const bookedDatabase = client.db('handMeDown').collection('booked');

    app.get('/homeProducts', async (req, res) => {
      const query = {};
      const cursor = productsDatabase.find(query).sort({ time: -1 }).limit(3);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/homeCategory', async (req, res) => {
      const query = {};
      const cursor = categoriesDatabase.find(query).sort({ time: -1 }).limit(3);
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
      const cursor = productsDatabase.find(query).sort({ time: -1 });
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsDatabase.findOne(query);
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

    app.get('/categories/:name', async (req, res) => {
      const name = req.params.name;
      console.log(name);
      const query = { category: name };
      const cursor = productsDatabase.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersDatabase.insertOne(user);
      user.id = result.insertedId;
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      const query = {};
      const result = await usersDatabase.find(query).toArray();
      res.send(result);
    })

    app.get('/users/seller/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersDatabase.findOne(query);
      console.log({ isSeller: user?.role === 'Seller' });
      res.send({ isSeller: user?.role === 'Seller' });
    })

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersDatabase.findOne(query);
      console.log({ isAdmin: user?.role === 'Admin' });
      res.send({ isAdmin: user?.role === 'Admin' });
    })


    app.put('/users/admin/:id', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersDatabase.findOne(query);
      if (user.role !== 'Admin') {
        return res.status(403).send('forbidden access');
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: 'Admin'
        }
      }
      const result = await usersDatabase.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersDatabase.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.Access_token, { expiresIn: '8h' })
        return res.send({ accessToken: token });
      }
      console.log(user);
      res.status(403).send({ accessToken: '' });
    })

    app.post('/booked', async (req, res) => {
      const product = req.body;
      const result = await bookedDatabase.insertOne(product);
      product.id = result.insertedId;
      res.send(result);
    })

    // app.get('/booked', verifyJWT, async (req, res) => {
    //   const query = {};
    //   const decodedEmail = req.decoded.email;
    //   const cursor = bookedDatabase.find(query);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // })

    app.get('/booked', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const query = { buyer_email: email };
      const result = await bookedDatabase.find(query).toArray();
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