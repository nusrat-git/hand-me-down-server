const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET);
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
    const advertisedDatabase = client.db('handMeDown').collection('advertised');
    const reportedDatabase = client.db('handMeDown').collection('reported');

    const verifyAdmin = async (req, res, next) => {
      console.log('inside verify admin', req.decoded.email);
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersDatabase.findOne(query);
      if (user.role !== 'Admin') {
        return res.status(403).send('forbidden access');
      }
      next();
    }

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersDatabase.findOne(query);
      if (user.role !== 'Seller') {
        return res.status(403).send('forbidden access');
      }
      next();
    }

    app.post('/products', verifyJWT, async (req, res) => {
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

    app.get('/products/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsDatabase.findOne(query);
      res.send(result);
    })

    app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsDatabase.deleteOne(query);
      res.send(result);
    })

    app.get('/myproducts/:email', verifyJWT, verifySeller, async (req, res) => {
      const email = req.params.email;
      const query = { seller_email: email };
      const result = await productsDatabase.find(query).toArray();
      res.send(result);
    })

    app.get('/advertised/:id', verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsDatabase.findOne(query);
      res.send(result);
    })

    app.post('/advertised', verifyJWT, verifySeller, async (req, res) => {
      const advertise = req.body;
      const result = await advertisedDatabase.insertOne(advertise);
      advertise.id = result.insertedId;
      res.send(result);
    })

    app.delete('/advertised/:id', verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await advertisedDatabase.deleteOne(query);
      res.send(result);
    })

    app.get('/advertised', async (req, res) => {
      const query = {};
      const result = await advertisedDatabase.find(query).toArray();
      res.send(result);
    })

    app.post('/categories', verifyJWT, verifyAdmin, async (req, res) => {
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

    app.get('/categories/:name', verifyJWT, async (req, res) => {
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

    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const result = await usersDatabase.find(query).toArray();
      res.send(result);
    })

    app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersDatabase.deleteOne(query);
      res.send(result);
    })

    app.get('/users/seller/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersDatabase.findOne(query);
      res.send({ isSeller: user?.role === 'Seller' });
    })

    app.get('/users/seller/verified/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersDatabase.findOne(query);
      console.log({ isVerified: user?.role === 'Seller' && user?.verify === 'Verified' });
      res.send({ isVerified: user?.role === 'Seller' && user?.verify === 'Verified' });
    })
    
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersDatabase.findOne(query);
      res.send({ isAdmin: user?.role === 'Admin' });
    })


    app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
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

    app.put('/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verify: 'Verified'
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

    app.get('/buyers', verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: 'Buyer' };
      const result = await usersDatabase.find(query).toArray();
      res.send(result);
    })

    app.delete('/buyers/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersDatabase.deleteOne(query);
      res.send(result);
    })


    app.get('/sellers', verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: 'Seller' };
      const result = await usersDatabase.find(query).toArray();
      res.send(result);
    })

    app.delete('/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersDatabase.deleteOne(query);
      res.send(result);
    })

    app.post('/booked', verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await bookedDatabase.insertOne(product);
      product.id = result.insertedId;
      res.send(result);
    })

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

    app.get('/booked/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookedDatabase.findOne(query);
      res.send(result);
    })

    app.post('/reported', verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await reportedDatabase.insertOne(product);
      product.id = result.insertedId;
      res.send(result);
    })

    app.get('/reported', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const result = await reportedDatabase.find(query).toArray();
      res.send(result);
    })

    app.delete('/reported/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await reportedDatabase.deleteOne(query);
      res.send(result);
    })

    // app.post('/create-payment-intent', async (req, res) => {
    //   const booking = req.body;
    //   const price = booking.price
    //   console.log(price);
    //   const amount = price * 100;
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     currency: 'usd',
    //     amount: amount,
    //     "payment_method_type": [
    //       "card"
    //     ]
    //   });
    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });
    // })


  }
  finally {

  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Hand me down server listening on port ${port}`)
})