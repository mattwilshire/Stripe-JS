require("dotenv").config();
const express = require("express");
const app = express();
const PORT = 4000;

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const publicKey = process.env.PKEY
const stripe = require('stripe')(process.env.PRKEY);

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
	res.render('index', { pubKey:  publicKey});
});

app.get('/charge', async (req, res) => {
	let stripeToken = req.query.stripeToken;
	let customer = await stripe.customers.create({
		email: 'matt@gmail.com',
		name: 'Matt',
		source: stripeToken
	});

	let charge = await stripe.charges.create({
		amount: 500,
		currency: "eur",
		description: "from stripe js",
		metadata: { steamId: '7545435349213'},
		customer: customer.id
	});
	res.send(charge);
});

app.listen(PORT, () => {
	console.log("Stripe js running!")
});