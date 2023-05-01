require("dotenv").config();
const express = require("express");
const app = express();
const PORT = 4000;
const YOUR_DOMAIN = 'http://localhost:4000';

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

app.get('/intent', async (req, res) => {
	res.render('intent', { pubKey:  publicKey});
});

app.get('/pay', async (req, res) => {
	try {
		const paymentIntent = await stripe.paymentIntents.create({
			amount: 2000,
			currency: 'eur',
			payment_method_types: ['card'],
		});

		const clientSecret = paymentIntent.client_secret;
		res.json({clientSecret, message: 'Payment done!'});
	} catch(err) {
		console.log(error);
		res.status(500).json({ message: 'Internal server error.'});
	}
});

app.get('/paysavedcard', async (req, res) => {
	try {
		const paymentIntent = await stripe.paymentIntents.create({
			payment_method: 'pm_1N2ECPHhnv4PluXKeAjOnHNf',
			customer: 'cus_NnpoidDk7WguW5',
			amount: 2000,
			currency: 'eur',
			payment_method_types: ['card'],
			confirm: true,
			metadata: {
				steamId: '748343843920322',
				orderId: '5456'
			}
		});

		res.send(paymentIntent);
	} catch(err) {
		console.log(error);
		res.status(500).json({ message: 'Internal server error.'});
	}
});


app.get('/setup', async (req, res) => {
	let customer = await stripe.customers.create({
		email: 'matt@gmail.com',
		name: 'Matt',
		metadata: {
			colour: 'red',
			steamid: '732473247324712'
		}
	});
});

app.get('/attach', async (req, res) => {
	let stripeToken = req.query.stripeToken;
	const paymentMethod = await stripe.paymentMethods.create({
		type: 'card',
		card: {
		  token: stripeToken,
		},
	});

	let resp = await stripe.paymentMethods.attach(paymentMethod.id, {
  		customer: 'cus_NnpoidDk7WguW5',
	});

	res.send(resp);
});

app.get('/methods', async (req, res) => {
	const paymentMethods = await stripe.paymentMethods.list({
		customer: 'cus_NnpoidDk7WguW5',
		type: 'card', // The type of payment methods to retrieve (e.g. card).
	  });
	  
	  // Display the payment methods to the customer and allow them to select one.
	  console.log('Available payment methods:');
	  paymentMethods.data.forEach((paymentMethod) => {
		console.log(`- ${paymentMethod.card.brand} ending in ${paymentMethod.card.last4}`);
	  });

	  res.send(paymentMethods);
});

app.get('/charge', async (req, res) => {
	let stripeToken = req.query.stripeToken;

	// Shouldn't really create a customer every time
	// Just create one once, then use the customer id for every transaction, store customer id in DB.

	// let customer = await stripe.customers.create({
	// 	email: 'matt@gmail.com',
	// 	name: 'Matt',
	// 	source: stripeToken,
	// 	metadata: {
	// 		colour: 'red'
	// 	}
	// });

	let charge = await stripe.charges.create({
		amount: 500,
		currency: "eur",
		description: "test1",
		metadata: { 
			steamId: '7545435349213'
		},
		source: stripeToken,
		receipt_email: 'matthew@gmail.com'
	});
	res.send(charge);
});

app.get('/checkout', async (req, res) => {
	// Customer creation is only done when mode is subscription if customer_creation is set to if_required.

	let steamId = '748343843920322';

	// CHECK IF THE USER HAS A CUSTOMER ENTRY
	let customer = await stripe.customers.search({
		query: `metadata['steamId']:'${steamId}'`
	});

	let sessionData = {
		line_items: [
	  		{
				price: 'price_1MLpVYHhnv4PluXKqIfz2oVi',
	    		quantity: 1,
	  		},
		],
		mode: 'payment',
		payment_method_types: ['card'],
		success_url: `${YOUR_DOMAIN}/success?id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${YOUR_DOMAIN}/cancel`,
		customer_creation: 'if_required',
		shipping_address_collection: {
			allowed_countries: ['IE', 'CA']
		},
		allow_promotion_codes: true,
		// phone_number_collection: {
		// 	enabled: true
		// },
		expires_at: Math.floor(new Date().getTime() / 1000) + 1800,
		//customer_email : "test@gmail.com",
		metadata: {
			steamId: '748343843920322'
		}
	};

	if(customer.data.length > 0) {
		//sessionData['customer'] = customer.data[0].id;
	}

	//console.log(sessionData);

	// Set the metadata to the persons unique ID so when they finish this session checkout you can use the metadata 
	// to link the customer id to the database
	let session = await stripe.checkout.sessions.create(sessionData);

	res.redirect(303, session.url);
});

app.get('/checkoutCustom', async (req, res) => {
	let sessionData = {
		line_items: [
			{
				name: 'Custom Item',
				description: 'A custom item added to checkout',
				amount: 1000,
				currency: 'eur',
				quantity: 2,
			},
			{
				name: 'Purple Hoodie',
				description: 'for hoodie purple',
				amount: 5000,
				currency: 'eur',
				quantity: 1,
			}
		],
		mode: 'payment',
		payment_method_types: ['card'],
		success_url: `${YOUR_DOMAIN}/success?id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${YOUR_DOMAIN}/cancel`,
		expires_at: Math.floor(new Date().getTime() / 1000) + 1800,
		payment_intent_data:
		{
			metadata: {
				steamId: '748343843920322'
			}
		}
	};

	let session = await stripe.checkout.sessions.create(sessionData);

	res.redirect(303, session.url);
});

app.get('/success', async (req, res) => {
	let sessionId = req.query.id;
	const session = await stripe.checkout.sessions.retrieve(sessionId);
	// let customerId = session.customer;
	// let steam = session.metadata.steamId;

	// const customer = await stripe.customers.update(
  	// 	customerId,
  	// 	{
  	// 		metadata: {
  	// 			steamId: steam
  	// 		}
	// 	}
	// );
  res.json(session);
});

app.get('/checkoutSub', async (req, res) => {
	//Check if a customer is made for the user, this stops stripe making customers for every checkout session
	const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price: 'price_1MKBDtHhnv4PluXK6WeCQ0gj',
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${YOUR_DOMAIN}/success?id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN}/cancel`,
    metadata: {
    	steamId: '748343843920322'
    }
  });

  res.redirect(303, session.url);
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
	case 'checkout.session.completed':
		let session = event.data.object;
		console.log("Checkout was complete!");
		console.log(session);
		break;
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