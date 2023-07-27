require("dotenv").config();
const express = require("express");
const cors = require('cors');

const http = require('http');
const https = require('https');
const app = express();
const PORT = 4000;
const YOUR_DOMAIN = 'http://localhost:4000';

const IBAN = require('iban');

const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const publicKey = process.env.PKEY
const stripe = require('stripe')(process.env.PRKEY);

const fs = require('fs');

const httpsOptions = {
	cert: fs.readFileSync('./ssl/fullchain.pem'),
	key: fs.readFileSync('./ssl/privkey.pem')
}

const httpServer = http.createServer(app);
const httpsServer = https.createServer(httpsOptions, app);

app.set('view engine', 'ejs');
// app.use(bodyParser.json());

app.get('/.well-known/apple-developer-merchantid-domain-association', (req, res) => res.download('./public/apple-developer-merchantid-domain-association'))

app.use(cors())

app.use((req, res, next)  => {
	  if (req.originalUrl === '/api/stripe/webhook') {
		next();
	  } else {
		express.json()(req, res, next);
	  }
	}
);

app.use(cookieParser());

app.get('/', async (req, res) => {
	res.render('index', { pubKey:  publicKey});
});

app.get('/pass', async (req, res) => {
	res.download('./public/new.pkpass')
});

app.get('/payout', async (req, res) => {
  
	try {

	// 	const account = await stripe.accounts.create({
	// 		type: 'custom',
	// 		country: 'IE',
	// 		business_type: 'individual',
	// 		individual: {
	// 		  first_name: 'Matt',
	// 		  last_name: 'W'
	// 		},
	// 		capabilities: {
	// 			transfers: {
	// 			  requested: true,
	// 			}
	// 		},
	// 		external_account: {
	// 		  object: 'bank_account',
	// 		  country: 'IE',
	// 		  currency: 'EUR',
	// 		  account_holder_name: 'Matt W',
	// 		  account_number: 'IE29AIBK93115212345678'
	// 		}
	// 	}); //acct_1NLnqjQWjdYbw8sP
	  
	// 	  console.log('Destination account created:', account);
	// 	  return account;
	// 	} catch (error) {
	// 	  console.error('Error creating destination account:', error);
	// 	  throw error;
	// 	}

	//   // Create a payout using Stripe API

	const balance = await stripe.balance.retrieve();
	res.send(balance);

	//   const payout = await stripe.transfers.create({
	// 	amount: 10,
	// 	currency: "eur",
	// 	destination: "acct_1NX6XxHDGYcb6MzJ",
	//   });
  
	//   // Handle successful payout
	//   console.log('Payout created:', account);
  
	//   // Send a response to the user
	//   res.send('Payout successful!');
	} catch (error) {
	  // Handle errors
	  console.error('Error creating payout:', error);
  
	  // Send an error response to the user
	  res.status(500).send('Error processing payout.');
	}
});

app.get('/intent', async (req, res) => {
	res.render('intent', { pubKey:  publicKey});
});

app.get('/applegooglepay', async (req, res) => {
	res.render('applegooglepay', { pubKey:  publicKey});
});

app.get('/intentnew', async (req, res) => {
	res.render('intentnew', { pubKey:  publicKey});
});

app.get('/subscribe', async (req, res) => {
	res.render('subscribe', { pubKey:  publicKey});
});

app.post('/pay', async (req, res) => {
	try {
		let {name} = req.body;

		const paymentIntent = await stripe.paymentIntents.create({
			amount: 2000,
			currency: 'eur',
			payment_method_types: ['card'],
			metadata: {
				name: name
			}
		});

		const clientSecret = paymentIntent.client_secret;
		res.json({clientSecret, message: 'Payment intent created!'});
	} catch(err) {
		console.log(error);
		res.status(500).json({ message: 'Internal server error.'});
	}
});

app.get('/secret', async (req, res) => {
	try {
		const paymentIntent = await stripe.paymentIntents.create({
			amount: 500,
			currency: 'eur'
		});

		const clientSecret = paymentIntent.client_secret;
		res.json({clientSecret, message: 'Payment intent created!'});
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
			amount: 200000,
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

app.get('/subs', async (req, res) => {
	//Check if a customer is made for the user, this stops stripe making customers for every checkout session
	const subscriptions = await stripe.subscriptions.list({});

	res.json(subscriptions);
});

app.get('/delSub', async (req, res) => {

	const subscription = await stripe.subscriptions.update(
		'sub_1NYUTfHhnv4PluXKQIbwKzT6',
		{
		  cancel_at_period_end: true,
		}
	);

	// const deleted = await stripe.subscriptions.cancel('sub_1NYUVqHhnv4PluXKZHdspvrX');

	res.json(subscription);
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
	customer_email: 'matt@gmail.com',
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

app.get('/subbackend', async (req, res) => {
	try {
		// Create the subscription. Note we're expanding the Subscription's
		// latest invoice and that invoice's payment_intent
		// so we can pass it to the front end to confirm the payment
		const subscription = await stripe.subscriptions.create({
			customer: 'cus_NxyQXYkqrQLCUV',
			items: [{
				price: 'price_1MKBDtHhnv4PluXK6WeCQ0gj',
			}],
			payment_behavior: 'default_incomplete',
			payment_settings: {
				payment_method_types: ['card', 'paypal'],
				save_default_payment_method: 'on_subscription'
			},
			expand: ['latest_invoice.payment_intent'],
		});

		res.send({
			subscriptionId: subscription.id,
			clientSecret: subscription.latest_invoice.payment_intent.client_secret,
		});
	} catch (error) {
		return res.status(400).send({ error: { message: error.message } });
	}
})

app.get('/payment-sheet', async (req, res) => {
  // Use an existing Customer ID if this is a returning customer.
  const customer = await stripe.customers.create();
  const ephemeralKey = await stripe.ephemeralKeys.create(
    {customer: customer.id},
    {apiVersion: '2020-08-27'}
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000,
    currency: 'eur',
    customer: customer.id,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey: process.env.PKEY
  });
});

app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), (request, response) => {
	const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.ESECRET);
  } catch (err) {
	console.log(err.message);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'customer.created':
      const customerCreated = event.data.object;
      console.log("Customer Created!")
      break;
    case 'invoice.paid':
      const invoicePaid = event.data.object;
		// PAID FOR SUBSCRIPTION!
	  console.log("Invoice paid!!");
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
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
// app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
//   const sig = request.headers['stripe-signature'];
//   let event;
//   try {
// 	event = stripe.webhooks.constructEvent(request.body, sig, process.env.ESECRET);
//   } catch (err) {
// 	response.status(400).send(`Webhook Error: ${err.message}`);
// 	return;
//   }

//   switch (event.type) {
// 	case 'checkout.session.completed':
// 		let session = event.data.object;
// 		console.log("Checkout was complete!");
// 		console.log(session);
// 		break;
// 	case 'invoice.paid':
// 	  // PAID FOR SUBSCRIPTION!
// 	  console.log("Invoice paid!!");
// 	  break;
// 	case 'customer.created':
// 	  console.log("Customer created!");
// 	  break;
// 	case 'invoice.payment_failed':
// 	  console.log("Invoice Payement FAILED!!");
// 	  break;
// 	case 'invoice.payment_succeeded':
// 	  console.log("Invoice Payment Succeeded");
// 	  break;
// 	case 'invoice.finalized':
// 	  console.log("Invoice Finalized");
// 	  break;
// 	case 'invoice.marked_uncollectible':
// 		console.log("Invoice uncollectable ?")
// 		break;
// 	case 'invoice.voided':
// 		console.log("Invoice VOIDED!")
// 		break;
// 	case 'invoice.created':
// 		//https://stripe.com/docs/billing/invoices/subscription
// 		// 'Subscription renewal invoices' On the page above
// 		// Finalize the subscription by its id as if you manually create them this webhook will instantly finalize them
// 		// When a invoice (subscription) is due the invoice is in draft state for an hour then it pays it!
// 		const invoice = event.data.object;
// 		if(invoice.status == 'paid') {
// 			console.log("Invoice was created (paid)")
// 		} else {
// 			console.log("Invoice created");
// 		}

// 		// Pay for it straight away, useful if you don't want the subscription to be in a draft state for an hour.
// 		//const inv = await stripe.invoices.finalizeInvoice(invoice.id, {auto_advance: 'true'});
// 		//const paid = await stripe.invoices.pay(invoice.id);
// 	  break;
// 	default:
// 	  console.log(`Unhandled event type ${event.type}`);
//   }

//   response.send();
// });

// app.listen(PORT, () => {
// 	console.log("Stripe js running!")
// });

httpsServer.listen(443, () => { console.log("HTTPS Server Up!") });
httpServer.listen(4000, () => { console.log("HTTP Server Up!") });