const Alexa = require('ask-sdk');
// Add i18n modules for l10n
const i18n = require('i18next'); 
const sprintf = require('i18next-sprintf-postprocessor');
// constants mainly used for ISP to avoid typos
const constants = {
	SPACE : ' ', // used in prompts 
	GREETINGS_PACK: 'Greetings_Pack',
	PREMIUM_SUBSCRIPTION: 'Premium_Subscription',
	PURCHASABLE: 'PURCHASABLE',
	ENTITLED: 'ENTITLED',
	NOT_ENTITLED: 'NOT_ENTITLED',
	ALREADY_PURCHASED: 'ALREADY_PURCHASED',
	DECLINED: 'DECLINED',
	ACCEPTED: 'ACCEPTED',
}

const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
	},
	handle(handlerInput) {
		const skillName = handlerInput.t('SKILL_NAME');
		const speechText = handlerInput.t('WELCOME', skillName);

		return handlerInput.responseBuilder
			.speak(speechText)
			.reprompt(speechText)
			.withSimpleCard(skillName, speechText)
			.getResponse();
	},
};

const GetAnotherHelloHandler = {
	canHandle(handlerInput){
		return(
			handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
			(handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent' ||
			handlerInput.requestEnvelope.request.intent.name === 'SimpleHelloIntent'));
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
		let preSpeechText = '';

		return monetizationClient.getInSkillProducts(locale).then(function(res) {
			//Use the helper function getResponseBasedOnAccessType to determine the response based on the products the customer has purchased
			return getResponseBasedOnAccessType(handlerInput,res,preSpeechText);
		});
	}
};

const NoIntentHandler = {
	canHandle(handlerInput){
		return(
			handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent'
		);
	},
	handle(handlerInput){
		const speechText = handlerInput.t('GOODBYE');

		return handlerInput.responseBuilder
			.speak(speechText)
			.getResponse();
	}
};

//Respond to the utterance "what can I buy"
const WhatCanIBuyIntentHandler = {
	canHandle(handlerInput){
		return (handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
    handlerInput.requestEnvelope.request.intent.name === 'WhatCanIBuyIntent');
	},
	handle(handlerInput){
		//Get the list of products available for in-skill purchase
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
		return monetizationClient.getInSkillProducts(locale).then(function(res){
			//res contains the list of all ISP products for this skill. 
			// We now need to filter this to find the ISP products that are available for purchase (NOT ENTITLED)
			const purchasableProducts = res.inSkillProducts.filter(
				record => record.entitled === constants.NOT_ENTITLED &&
        record.purchasable === constants.PURCHASABLE
			);

			// Say the list of products 
			if (purchasableProducts.length > 0){
				//One or more products are available for purchase. say the list of products
				const speechText = handlerInput.t('PRODUCTS.TO_PURCHASE', getSpeakableListOfProducts(purchasableProducts));
				const repromptOutput = handlerInput.t('PRODUCTS.REPROMPT');
				
				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse();  
			}
			else{
				// no products are available for purchase. Ask if they would like to hear another greeting
				const speechText = handlerInput.t('PRODUCTS.NO_MORE_FOR_PURCHASE');
				const repromptOutput = handlerInput.t('PRODUCTS.REPROMPT');

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse();  
			}
		});
	}
};

const TellMeMoreAboutGreetingsPackIntentHandler = {
	canHandle(handlerInput){
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
    handlerInput.requestEnvelope.request.intent.name === 'TellMeMoreAboutGreetingsPackIntent';
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(res){
			// Filter the list of products available for purchase to find the product with the reference name "Greetings_Pack"
			const greetingsPackProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.GREETINGS_PACK
			);

			if (isEntitled(greetingsPackProduct)){
				//Customer has bought the Greetings Pack. They don't need to buy the Greetings Pack. 
				const speechText = handlerInput.t('GREETINGS_PACK.PURCHASED') + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
				const repromptOutput = handlerInput.t('GREETINGS.ANOTHER');

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse(); 
			}
			else{
				//Customer has bought neither the Premium Subscription nor the Greetings Pack Product. 
				//Make the upsell
				const speechText = handlerInput.t('OK');
				return makeUpsell(speechText,greetingsPackProduct,handlerInput);						
			}
		});
	}
};

const TellMeMoreAboutPremiumSubscriptionIntentHandler = {
	canHandle(handlerInput){
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
    handlerInput.requestEnvelope.request.intent.name === 'TellMeMoreAboutPremiumSubscription';
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(res){
			// Filter the list of products available for purchase to find the product with the reference name "Premium_Subscription"
			const premiumSubscriptionProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.PREMIUM_SUBSCRIPTION
			);

			if (isEntitled(premiumSubscriptionProduct)){
				//Customer has bought the Premium Subscription. They don't need to buy the Greetings Pack. 
				const speechText = handlerInput.t('PREMIUM_SUBSCRIPTION.PURCHASED', premiumSubscriptionProduct[0].summary) + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
				const repromptOutput = handlerInput.t('GREETINGS.ANOTHER');
				
				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse(); 
			}
			else{
				//Customer has bought neither the Premium Subscription nor the Greetings Pack Product. 
				//Make the upsell
				const speechText = handlerInput.t('OK');
				return makeUpsell(speechText,premiumSubscriptionProduct,handlerInput);						
			}
		});
	}
};

const BuyGreetingsPackIntentHandler = {
	canHandle(handlerInput){
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
		handlerInput.requestEnvelope.request.intent.name === 'BuyGreetingsPackIntent';
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(res){
			// Filter the list of products available for purchase to find the product with the reference name "Greetings_Pack"
			const greetingsPackProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.GREETINGS_PACK
			);
			// Filter the list of products available for purchase to find the product with the reference name "Premium_Subscription"
			const premiumSubscriptionProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.PREMIUM_SUBSCRIPTION
			);

			if (isEntitled(premiumSubscriptionProduct)){
				//Customer has bought the Premium Subscription. They don't need to buy the Greetings Pack. 
				const speechText = handlerInput.t('GREETINGS_PACK.PREMIUM_SUBSCRIPTION_PURCHASED') + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
				const repromptOutput = handlerInput.t('GREETINGS.ANOTHER');

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse(); 
			}
			else if (isEntitled(greetingsPackProduct)){
				//Customer has bought the Greetings Pack. Deliver the special greetings
				const speechText = handlerInput.t('GREETINGS_PACK.PURCHASED') + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
				const repromptOutput = handlerInput.t('GREETINGS.ANOTHER');

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse(); 
			}
			else{
				//Customer has bought neither the Premium Subscription nor the Greetings Pack Product. 
				//Make the buy offer for Greetings Pack
				return makeBuyOffer(greetingsPackProduct,handlerInput);
			}
		});
	}
};

const GetSpecialGreetingsIntentHandler = {
	canHandle(handlerInput){
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
		handlerInput.requestEnvelope.request.intent.name === 'GetSpecialGreetingsIntent';
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(res){
			// Filter the list of products available for purchase to find the product with the reference name "Greetings_Pack"
			const greetingsPackProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.GREETINGS_PACK
			);
			// Filter the list of products available for purchase to find the product with the reference name "Premium_Subscription"
			const premiumSubscriptionProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.PREMIUM_SUBSCRIPTION
			);

			if (isEntitled(premiumSubscriptionProduct)){
				//Customer has bought the Premium Subscription. They don't need to buy the Greetings Pack. 
				const speechText = handlerInput.t('GREETINGS_PACK.PREMIUM_SUBCRIPTION_PURCHASED') + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
				const repromptOutput = handlerInput.t('GREETINGS.ANOTHER');

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse(); 
			}
			else 	if (isEntitled(greetingsPackProduct)){
				//Customer has bought the Greetings Pack. Deliver the special greetings
				const speechText = handlerInput.t('GREETINGS_PACK.PURCHASED') + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
				const repromptOutput = handlerInput.t('GREETINGS.ANOTHER');

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse(); 
			}
			else{
				//Customer has bought neither the Premium Subscription nor the Greetings Pack Product. 
				//Make the upsell
				const speechText = handlerInput.t('GREETINGS_PACK.UPSELL');
				return makeUpsell(speechText,greetingsPackProduct,handlerInput);						
			}
		});
	}
};

const BuyPremiumSubscriptionIntentHandler = {
	canHandle(handlerInput){
		return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
    handlerInput.requestEnvelope.request.intent.name === 'BuyPremiumSubscriptionIntent';
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(res){
			// Filter the list of products available for purchase to find the product with the reference name "Premium_Subscription"
			const premiumSubscriptionProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.PREMIUM_SUBSCRIPTION
			);
      
			//Send Connections.SendRequest Directive back to Alexa to switch to Purchase Flow
			return makeBuyOffer(premiumSubscriptionProduct,handlerInput);						
		});
	}
};

const BuyResponseHandler = {
	canHandle(handlerInput){
		return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
        (handlerInput.requestEnvelope.request.name === 'Buy' ||
        handlerInput.requestEnvelope.request.name === 'Upsell');
	},
	handle(handlerInput){
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
		const productId = handlerInput.requestEnvelope.request.payload.productId;
		
		return monetizationClient.getInSkillProducts(locale).then(function(res){
			// Filter the list of products to only get the product corresponding to the productId sent by the Alexa Service
			const product = res.inSkillProducts.filter(
				record => record.productId === productId
			);

			if (handlerInput.requestEnvelope.request.status.code === '200'){
				let preSpeechText;

				// check the Buy status - acccepted, declined, already purchased, or something went wrong.
				switch (handlerInput.requestEnvelope.request.payload.purchaseResult){
				case constants.ACCEPTED:
				case constants.ALREADY_PURCHASED:
					// provide here the same answer when successful purchase or when already purchase
					// based on your context, you can provide differianted messages.
					const productReferenceName = product[0].referenceName;
					const productName = product[0].name;
					if (productReferenceName === constants.GREETINGS_PACK){
						preSpeechText = handlerInput.t('BUY.ACCEPTED.GREETINGS_PACK', productName);
					}
					else if (productReferenceName === constants.PREMIUM_SUBSCRIPTION){
						preSpeechText = handlerInput.t('BUY.ACCEPTED.PREMIUM_SUBSCRIPTION', productName);
					}
					else{
						console.log('Product Undefined');
						preSpeechText = handlerInput.t('BUY.ACCEPTED.UNDEFINED');
					}
					break;
				case constants.DECLINED:
					preSpeechText = handlerInput.t('BUY.DECLINED');
					break;
				default: 
					preSpeechText = handlerInput.t('BUY.ERROR', product[0].name);
					break;
				}        
				//respond back to the customer
				return getResponseBasedOnAccessType(handlerInput,res,preSpeechText);
			}
			else {
				// Request Status Code NOT 200. Something has failed with the connection. 
				console.log(
					`Connections.Response indicated failure. error: + ${handlerInput.requestEnvelope.request.status.message}`
				);
				const speechText = handlerInput.t('PURCHASE.ERROR');
				return handlerInput.responseBuilder
					.speak(speechText)
					.getResponse();
			}
		});
	}
};

const PurchaseHistoryIntentHandler = {
	canHandle(handlerInput) {
		return (
			handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'PurchaseHistoryIntent'
		);
	},
	handle(handlerInput) {
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(result) {
			const entitledProducts = getAllEntitledProducts(result.inSkillProducts);
			if (entitledProducts && entitledProducts.length > 0) {
				const speakableListOfProducts = getSpeakableListOfProducts(entitledProducts)
				const speechText = handlerInput.t('PURCHASE.HISTORY', speakableListOfProducts) + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
				const repromptOutput = handlerInput.t('PURCHASE.HISTORY_REPROMPT', speakableListOfProducts) + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');

				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse();
			}
			else{
				const speechText = handlerInput.t('PURCHASE.NONE');
				const repromptOutput = handlerInput.t('PURCHASE.NONE_REPROMPT') + constants.SPACE + handlerInput.t('GREETINGS.ANOTHER');
  
				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse();  
			}
		});
	}
};

const RefundGreetingsPackIntentHandler = {
	canHandle(handlerInput) {
		return (
			handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'RefundGreetingsPackIntent'
		);
	},
	handle(handlerInput) {
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(res) {
			const premiumProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.GREETINGS_PACK
			);
			return handlerInput.responseBuilder
				.addDirective({
					type: 'Connections.SendRequest',
					name: 'Cancel',
					payload: {
						InSkillProduct: {
							productId: premiumProduct[0].productId
						}
					},
					token: 'correlationToken'
				})
				.getResponse();
		});
	}
};

const CancelPremiumSubscriptionIntentHandler = {
	canHandle(handlerInput) {
		return (
			handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'CancelPremiumSubscriptionIntent'
		);
	},
	handle(handlerInput) {
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();

		return monetizationClient.getInSkillProducts(locale).then(function(res) {
			const premiumProduct = res.inSkillProducts.filter(
				record => record.referenceName === constants.PREMIUM_SUBSCRIPTION
			);
			return handlerInput.responseBuilder
				.addDirective({
					type: 'Connections.SendRequest',
					name: 'Cancel',
					payload: {
						InSkillProduct: {
							productId: premiumProduct[0].productId
						}
					},
					token: 'correlationToken'
				})
				.getResponse();
		});
	}
};

const CancelProductResponseHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
      handlerInput.requestEnvelope.request.name === 'Cancel';
	},
	handle(handlerInput) {
		const locale = handlerInput.requestEnvelope.request.locale;
		const monetizationClient = handlerInput.serviceClientFactory.getMonetizationServiceClient();
		const productId = handlerInput.requestEnvelope.request.payload.productId;
		let speechText;
		let repromptOutput;
    
		return monetizationClient.getInSkillProducts(locale).then(function(res) {
			const product = res.inSkillProducts.filter(
				record => record.productId === productId
			);
      
			console.log(
				`PRODUCT = ${JSON.stringify(product)}`
			);

			if (handlerInput.requestEnvelope.request.status.code === '200') {
				//Alexa handles the speech response immediately following the cancelation reqquest. 
				//It then passes the control to our CancelProductResponseHandler() along with the status code (ACCEPTED, DECLINED, NOT_ENTITLED)
				//We use the status code to stitch additional speech at the end of Alexa's cancelation response. 
				//Currently, we have the same additional speech (GREETING.ANOTHER) for accepted, canceled, and not_entitled. You may edit these below, if you like. 
				if (handlerInput.requestEnvelope.request.payload.purchaseResult === constants.ACCEPTED) {
					//The cancelation confirmation response is handled by Alexa's Purchase Experience Flow.
					//Simply add to that with a confirmation question (yes/no) for another greeting
					speechText = handlerInput.t('GREETING.ANOTHER');
					repromptOutput = handlerInput.t('GREETING.ANOTHER');
				}
				else if (handlerInput.requestEnvelope.request.payload.purchaseResult === constants.DECLINED) {
					speechText = handlerInput.t('GREETING.ANOTHER');
					repromptOutput = handlerInput.t('GREETING.ANOTHER');
				}
				else if (handlerInput.requestEnvelope.request.payload.purchaseResult === constants.NOT_ENTITLED) {
					//No subscription to cancel. 
					//The "No subscription to cancel" response is handled by Alexa's Purchase Experience Flow.
					//Simply add to that with a confirmation question (yes/no) for another greeting
					speechText = handlerInput.t('GREETINGS.ANOTHER');
					repromptOutput = handlerInput.t('GREETINGS.ANOTHER');
				}
				return handlerInput.responseBuilder
					.speak(speechText)
					.reprompt(repromptOutput)
					.getResponse();
			}
			// Something failed.
			console.log(
				`Connections.Response indicated failure. error: ${handlerInput.requestEnvelope.request.status.message}`
			);

			speechText = handlerInput.t('PURCHASE.ERROR');
			return handlerInput.responseBuilder
				.speak(speechText)
				.getResponse();
		});
	},
};

const HelpIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
	},
	handle(handlerInput) {
		const speechText = handlerInput.t('HELP');
		const skillName = handlerInput.t('SKILL_NAME');

		return handlerInput.responseBuilder
			.speak(speechText)
			.reprompt(speechText)
			.withSimpleCard(skillName, speechText)
			.getResponse();
	},
};

const CancelAndStopIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
	},
	handle(handlerInput) {
		const speechText = handlerInput.t('GOODBYE');
		const skillName = handlerInput.t('SKILL_NAME');

		return handlerInput.responseBuilder
			.speak(speechText)
			.withSimpleCard(skillName, speechText)
			.getResponse();
	},
};

const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
	},
	handle(handlerInput) {
		console.log(
			`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`
		);

		return handlerInput.responseBuilder.getResponse();
	},
};

const ErrorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error) {
		console.log(
			`Error handled: ${error.message}`
		);
		const speechText = handlerInput.t('ERROR');
	
		return handlerInput.responseBuilder
			.speak(speechText)
			.reprompt(speechText)
			.getResponse();
	},
};

// *****************************************
// *********** HELPER FUNCTIONS ************
// *****************************************

function randomize(array){
	const randomItem = array[Math.floor(Math.random() * array.length)];
	return randomItem;
}

function getSpecialHello(locale) {
	const special_greetings = [
		{language: 'EN', greeting: 'Hello', locale:'en-US', voice:['Ivy','Joanna', 'Joey', 'Justin', 'Kendra', 'Kimberly', 'Matthew', 'Salli']},
		{language: 'HI', greeting: 'Namaste', locale:'en-IN', voice:['Aditi','Raveena']},
		{language: 'DE', greeting: 'Hallo', locale:'de-DE', voice:['Hans', 'Marlene', 'Vicki']},
		{language: 'ES', greeting: 'Hola', locale:'es-ES', voice:['Conchita', 'Enrique']},
		{language: 'FR', greeting: 'Bonjour', locale:'fr-FR', voice:['Celine', 'Lea', 'Mathieu']},
		{language: 'JA', greeting: 'Konichiwa', locale:'ja-JP', voice:['Mizuki', 'Takumi']},
		{language: 'IT', greeting: 'Ciao', locale:'it-IT', voice:['Carla', 'Giorgio']}
	];
	const currentLanguage = locale.split("-")[0].toUpperCase();
	const eligibleGreetings = special_greetings.filter(
		record => record.language !== currentLanguage
	);
	return randomize(eligibleGreetings);
}

function getSpeakableListOfProducts(entitleProductsList) {
	const productNameList = entitleProductsList.map(item => item.name);
	let productListSpeech = productNameList.join(', '); // Generate a single string with comma separated product names
	productListSpeech = productListSpeech.replace(/_([^_]*)$/, 'and $1'); // Replace last comma with an 'and '
	return productListSpeech;
}

function getResponseBasedOnAccessType(handlerInput,res,preSpeechText){
	// The filter() method creates a new array with all elements that pass the test implemented by the provided function.
	const greetingsPackProduct = res.inSkillProducts.filter(
		record => record.referenceName === constants.GREETINGS_PACK
	);

	console.log(
		`GREETINGS PACK PRODUCT = ${JSON.stringify(greetingsPackProduct)}`
	);

	const premiumSubscriptionProduct = res.inSkillProducts.filter(
		record => record.referenceName === constants.PREMIUM_SUBSCRIPTION
	);

	console.log(
		`PREMIUM SUBSCRIPTION PRODUCT = ${JSON.stringify(premiumSubscriptionProduct)}`
	);

	let speechText;
	let cardText;
	let repromptOutput;

	const skillName = handlerInput.t('SKILL_NAME');
	const locale = handlerInput.requestEnvelope.request.locale;
	const specialGreeting = getSpecialHello(locale);
	const preGreetingSpeechText = handlerInput.t('GREETINGS.SPECIAL.PRE', preSpeechText);
	const specialGreetingLanguage = handlerInput.t('LANGUAGE.' + specialGreeting.language);
	const postGreetingSpeechText = handlerInput.t('GREETINGS.SPECIAL.POST', specialGreetingLanguage);
	const langSpecialGreeting = switchLanguage(specialGreeting.greeting + '!', specialGreeting.locale);

	if (isEntitled(premiumSubscriptionProduct)){
		//Customer has bought the Premium Subscription. Switch to Polly Voice, and return special hello
		cardText = `${preGreetingSpeechText} ${specialGreeting.greeting}! ${postGreetingSpeechText}`;
		const randomVoice = randomize(specialGreeting.voice);
		speechText = `${preGreetingSpeechText} ${switchVoice(langSpecialGreeting, randomVoice)} ${postGreetingSpeechText} ${handlerInput.t('GREETINGS.ANOTHER')}`;
		repromptOutput = `${handlerInput.t('GREETINGS.ANOTHER')}`;
	}
	else if (isEntitled(greetingsPackProduct)) {
		//Customer has bought the Greetings Pack, but not the Premium Subscription. Return special hello greeting in Alexa voice
		cardText = `${preGreetingSpeechText} ${specialGreeting.greeting}! ${postGreetingSpeechText}`;
		speechText = `${preGreetingSpeechText} ${langSpecialGreeting} ${postGreetingSpeechText}. ${handlerInput.t('GREETINGS.ANOTHER')}`;
		repromptOutput = `${handlerInput.t('GREETINGS.ANOTHER')}`;
	}
	else{
		//Customer has bought neither the Premium Subscription nor the Greetings Pack Product.
		const theGreeting = handlerInput.t('SIMPLE_HELLO');
		//Determine if upsell should be made. returns true/false
		if (shouldUpsell(handlerInput)){
			//Say the simple greeting, and then Upsell Greetings Pack
			speechText = handlerInput.t('GREETINGS.SIMPLE', theGreeting) + ' ' + handlerInput.t('GREETINGS.UPSELL');
			return makeUpsell(speechText,greetingsPackProduct,handlerInput);
		}
		else{
			// Do not make the upsell. Just return Simple Hello Greeting.
			cardText = handlerInput.t('GREETINGS.SIMPLE', theGreeting);
			speechText = handlerInput.t('GREETINGS.SIMPLE', theGreeting) + ' ' + handlerInput.t('GREETINGS.ANOTHER');
			repromptOutput = handlerInput.t('GREETINGS.ANOTHER');
		}
	}

	return handlerInput.responseBuilder
		.speak(speechText)
		.reprompt(repromptOutput)
		.withSimpleCard(skillName, cardText)
		.getResponse(); 
}

function isProduct(product) {
	return product && product.length > 0;
}
function isEntitled(product) {
	return isProduct(product) && product[0].entitled === constants.ENTITLED;
}

function getAllEntitledProducts(inSkillProductList) {
	const entitledProductList = inSkillProductList.filter(
		record => record.entitled === constants.ENTITLED
	);
	return entitledProductList;
}

function makeUpsell(preUpsellMessage,greetingsPackProduct,handlerInput){
	const learnMorePrompt = handlerInput.t('LEARN_MORE');
	let upsellMessage = `${preUpsellMessage}. ${greetingsPackProduct[0].summary}. ${learnMorePrompt}`;
    
	return handlerInput.responseBuilder
		.addDirective({
			type: 'Connections.SendRequest',
			name: 'Upsell',
			payload: {
				InSkillProduct: {
					productId: greetingsPackProduct[0].productId
				},
				upsellMessage
			},
			token: 'correlationToken'
		})
		.getResponse();
}

function makeBuyOffer(theProduct,handlerInput){
    
	return handlerInput.responseBuilder
		.addDirective({
			type: 'Connections.SendRequest',
			name: 'Buy',
			payload: {
				InSkillProduct: {
					productId: theProduct[0].productId
				}
			},
			token: 'correlationToken'
		})
		.getResponse();
}

function shouldUpsell(handlerInput) {
	if (handlerInput.requestEnvelope.request.intent === undefined){
		//If the last intent was Connections.Response, do not upsell
		return false;    
	}
	else{
		return randomize([true,false]); //randomize upsell
	}
}

function switchVoice(speakOutput, voice_name){
	if (speakOutput && voice_name){
		return `<voice name="${voice_name}"> ${speakOutput} </voice>`;
	}
	return speakOutput;
}

function switchLanguage(speakOutput, locale){
	if (speakOutput && locale){
		return `<lang xml:lang="${locale}"> ${speakOutput} </lang>`;
	}
	return speakOutput;
}

// *****************************************
// *********** Interceptors ************
// *****************************************
const LogResponseInterceptor = {
	process(handlerInput) {
		console.log(
			`RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`
		);
	}
};

const LogRequestInterceptor = {
	process(handlerInput) {
		console.log(
			`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`
		);
	}
};

/**
 * Request Interceptor for i18n handling
 */
const LocalizationInterceptor = {
	process(handlerInput) {
		const locale = handlerInput.requestEnvelope.request.locale;
		const language = locale.split("-")[0];
		let languageStrings = {};
		// eslint-disable-next-line global-require
		const fs = require('fs');
		// load language strings if exist (e.g fr.js)
		try {
			if (fs.existsSync(`./i18n/${language}.js`)) {
				// eslint-disable-next-line global-require
				languageStrings[language] = require(`./i18n/${language}.js`);
			}
		} catch(err) {
			console.log(`Error while loading file : ./i18n/${language}.js : ${err}`)
		}		
		// load locale strings if exist (e.g fr-FR.js)
		try {
			if (fs.existsSync(`./i18n/${locale}.js`)) {
				// eslint-disable-next-line global-require
				languageStrings[locale] = require(`./i18n/${locale}.js`);
			}
		} catch(err) {
			console.log(`Error while loading file : ./i18n/${locale}.js : ${err}`)
		}
		// init i18n
		const localizationClient = i18n.use(sprintf).init({
			lng: locale,
			fallbackLng: 'en', // fallback to EN if locale doesn't exist
			resources: languageStrings
		});
		// define l10n function
		localizationClient.localize = function () {
			const args = arguments;
			let values = [];

			for (var i = 1; i < args.length; i++) {
				values.push(args[i]);
			}
			const value = i18n.t(args[0], {
				returnObjects: true,
				postProcess: 'sprintf',
				sprintf: values
			});

			if (Array.isArray(value)) {
				return value[Math.floor(Math.random() * value.length)];
			} else {
				return value;
			}
		}
		// define function at handlerInput and RequestAttributes levels
		const attributes = handlerInput.attributesManager.getRequestAttributes();
		handlerInput.t = attributes.t = function (...args) { // pass on arguments to the localizationClient
			return localizationClient.localize(...args);
		};
	}
}
    
const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
	.addRequestHandlers(
		LaunchRequestHandler,
		GetAnotherHelloHandler,
		NoIntentHandler,
		WhatCanIBuyIntentHandler,
		TellMeMoreAboutGreetingsPackIntentHandler,
		TellMeMoreAboutPremiumSubscriptionIntentHandler,
		BuyGreetingsPackIntentHandler,
		GetSpecialGreetingsIntentHandler,
		BuyPremiumSubscriptionIntentHandler,
		BuyResponseHandler,
		PurchaseHistoryIntentHandler,
		RefundGreetingsPackIntentHandler,
		CancelPremiumSubscriptionIntentHandler,
		CancelProductResponseHandler,
		HelpIntentHandler,
		CancelAndStopIntentHandler,
		SessionEndedRequestHandler
	)
	.addErrorHandlers(ErrorHandler)
	.addRequestInterceptors(LogRequestInterceptor, LocalizationInterceptor)
	.addResponseInterceptors(LogResponseInterceptor)
	.lambda();