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
/*
	Use the test clocks to test subscriptions https://dashboard.stripe.com/test/test-clocks
	Set the time to anything such as 30/12/2022 23:40
	You create a customer and add a subscription they will have the time above set as creation time
	Now you can click advance clock and change it to 31/12/2022 23:41 to see what happens when a new invoice is created.
	Assuming you have the subscription to daily renewal!

	When you first create a subscription, it creates an invoice that is already paid
	Then when next invoice comes in it will create it then wait one hour before it takes payment
	To not wait one hour you can finalize it then take payment, but you must check the id
*/
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
	case 'invoice.payment_failed':
	  console.log("Invoice Payement FAILED!!");
	  break;
	case 'invoice.payment_succeeded':
	  console.log("Invoice Payment Succeeded");
	  break;
	case 'invoice.finalized':
	  console.log("Invoice Finalized");
	  break;
	case 'invoice.marked_uncollectible':
		console.log("Invoice uncollectable ?")
		break;
	case 'invoice.voided':
		console.log("Invoice VOIDED!")
		break;
	case 'invoice.created':
		//https://stripe.com/docs/billing/invoices/subscription
		// 'Subscription renewal invoices' On the page above
		// Finalize the subscription by its id as if you manually create them this webhook will instantly finalize them
		// When a invoice (subscription) is due the invoice is in draft state for an hour then it pays it!
		const invoice = event.data.object;
		if(invoice.status == 'paid') {
			console.log("Invoice was created (paid)")
		} else {
			console.log("Invoice created");
		}

		// Pay for it straight away, useful if you don't want the subscription to be in a draft state for an hour.
		//const inv = await stripe.invoices.finalizeInvoice(invoice.id, {auto_advance: 'true'});
		//const paid = await stripe.invoices.pay(invoice.id);
	  break;
	default:
	  console.log(`Unhandled event type ${event.type}`);
  }

  response.send();
});

app.listen(PORT, () => {
	console.log("Stripe js running!")
});