module.exports = {
    translation: {
        SKILL_NAME: 'Premium Hello World',
        
        WELCOME: 'Welcome to %s, you can say hello! How can I help?',

        OK: [
            'Sure.',
            'OK.',
            'Of course!'
        ],

        PRODUCTS: {
            TO_PURCHASE: `Products available for purchase at this time are %s.
            To learn more about a product, say 'Tell me more about' followed by the product name.
            If you are ready to buy, say, 'Buy' followed by the product name. So what can I help you with?`,
            NO_MORE_FOR_PURCHASE: 'There are no products to offer to you right now. Sorry about that. Would you like a greeting instead?',
            REPROMPT: 'I didn\'t catch that. What can I help you with?',
        },

        PURCHASE: {
            HISTORY: 'You have bought the following items: %s.',
            HISTORY_REPROMPT: 'You asked me for a what you\'ve bought, here\'s a list %s.',
            NONE: 'You haven\'t purchased anything yet. To learn more about the products you can buy, say - what can I buy. How can I help?',
            NONE_REPROMPT: 'You asked me for a what you\'ve bought, but you haven\'t purchased anything yet. You can say - what can I buy, or say yes to get another greeting.',
            ERROR: 'There was an error handling your purchase request. Please try again or contact us for help.'
        },

        GREETINGS_PACK: {
            PURCHASED:'Good News! You\'ve already purchased the Greetings Pack.',
            PREMIUM_SUBSCRIPTION_PURCHASED: 'Good News! You\'re subscribed to the Premium Subscription which includes all features of the Greetings Pack.',
            UPSELL: 'You need the Greetings Pack to get the special greeting.',
        },

        PREMIUM_SUBSCRIPTION: {
            PURCHASED:'Good News! You\'re subscribed to the Premium Subscription. %s',
        },

        GREETINGS: {
            SIMPLE: 'Here\'s your simple greeting: %s.',
            SPECIAL : {
                PRE: '%s Here\'s your special greeting: ',
                POST: 'That\'s hello in %s.',
            },
            UPSELL: 'By the way, you can now get greetings in more languages.',
            ANOTHER: [
                'Would you like another greeting?',
                'Can I give you another greeting?',
                'Do you want to hear another greeting?'
            ],
        },

        BUY: {
            ACCEPTED:{
                GREETINGS_PACK : 'With the %s, I can now say hello in a variety of languages.',
                PREMIUM_SUBSCRIPTION: 'With the %s, I can now say hello in a variety of languages, in different accents using Amazon Polly.',
                UNDEFINED: 'Sorry, that\'s not a valid product',
            },
            DECLINED: 'No Problem.',
            ERROR: 'Something unexpected happened, but thanks for your interest in the %s.'
        },

        LANGUAGE: {
            EN: 'english',
            DE: 'german',
            HI: 'hindi',
            FR: 'french',
            ES: 'spanish',
            JA: 'japanese',
            IT: 'italian',
        },
        
        SIMPLE_HELLO: [
            'Howdy!',
            'Hello!',
            'How are you?',
            'Hiya!'
        ],

        LEARN_MORE: [
            'Want to learn more about it?',
            'Should I tell you more about it?',
            'Want to learn about it?',
            'Interested in learning more about it?'
        ], 

        GOODBYE: [
            'OK.  Goodbye!',
            'Have a great day!',
            'Come back again soon!',
        ], 

        HELP : 'You can say hello to me! How can I help?',
        
        ERROR: 'Sorry, I didn\'t catch that. Can you please reformulate?', 

    }
}