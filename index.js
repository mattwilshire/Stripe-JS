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

	// Shouldn't really create a customer every time
	// Just create one once, then use the customer id for every transaction, store customer id in DB.
	let customer = await stripe.customers.create({
		email: 'matt@gmail.com',
		name: 'Matt',
		source: stripeToken,
		metadata: {
			colour: 'red'
		}
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

// Subscribe customer id to the product that is a recurring daily payment!
app.get('/sub', async (req, res) => {
	const subscription = await stripe.subscriptions.create({
		customer: 'cus_N4hobOHm4ef2Hv',
		items: [
			{price: 'price_1MKBDtHhnv4PluXK6WeCQ0gj'},
		],
	});
	res.send(subscription);
});

app.get('/inv', async (req, res) => {
	const inv = await stripe.invoices.finalizeInvoice('in_1MKYfNHhnv4PluXKwqR6JbEb', {auto_advance: 'true'});
	await stripe.invoices.pay('in_1MKYfNHhnv4PluXKwqR6JbEb');
	res.send(inv);
});

//https://stripe.com/docs/billing/invoices/subscription
app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.ESECRET);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  switch (event.type) {
    case 'invoice.paid':
      // PAID FOR SUBSCRIPTION!
      console.log("Invoice paid!!");
      break;
    case 'customer.created':
      console.log("Customer created!");
      break;
    case 'invoice.created':
    	//https://stripe.com/docs/billing/invoices/subscription
    	// 'Subscription renewal invoices' On the page above
    	// Invoice is created for subscription, DON'T FINALIZE IT STRAIGHT AWAY
    	// This is because invoices can be created manually
    	// When a invoice (subscription) is due the invoice is in draft state for an hour then it pays it!
    	const invoice = event.data.object;
    	if(invoice.status == 'paid') return;
    	//const inv = await stripe.invoices.finalizeInvoice(invoice.id, {auto_advance: 'true'});
    	// Pay for it straight away
			//const paid = await stripe.invoices.pay(invoice.id);
      console.log("Invoice created & paid!");
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  response.send();
});

app.listen(PORT, () => {
	console.log("Stripe js running!")
});