const Alexa = require("ask-sdk-core");
const rotator = require("./rotator");

async function askToGPT(prompt) {
  return await rotator.makeInference(prompt);
}

function formatString(text) {
  return text.replace(/\n+/g, " ");
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  async handle(handlerInput) {
    const response =
      'Seja bem-vindo ao GPT-3. Você pode perguntar algo como "chat, qual a capital da França?"';

    return handlerInput.responseBuilder.speak(response).getResponse();
  },
};

const HelloWorldIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AskToGPTIntent"
    );
  },
  async handle(handlerInput) {
    const question = Alexa.getSlotValue(
      handlerInput.requestEnvelope,
      "question"
    );

    let responseFromGPT;
    try {
      responseFromGPT = await askToGPT(question);
    } catch (error) {
      const fallbackMessage =
        "Desculpe, não consegui processar sua pergunta neste momento. Por favor, tente novamente.";
      return handlerInput.responseBuilder.speak(fallbackMessage).getResponse();
    }

    const formattedResponse = formatString(responseFromGPT);

    return handlerInput.responseBuilder.speak(formattedResponse).getResponse();
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const speakOutput =
      "Você pode perguntar algo como 'chat, ideia de nome para bebês'";

    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.CancelIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.StopIntent")
    );
  },
  handle(handlerInput) {
    const speakOutput = "Até mais!";

    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.FallbackIntent"
    );
  },
  handle(handlerInput) {
    const speakOutput =
      "Desculpe, não tenho conhecimento sobre isso. Por favor, tente novamente.";

    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  },
};

const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
    );
  },
  handle(handlerInput) {
    const speakOutput = `Que tal me perguntar algo como 'quanto está o dólar hoje?'`;

    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    const speakOutput =
      "Desculpe, parece que tivemos um problema aqui! Acesse github.com/joao208/alexa-chatgpt para mais informações.";

    return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    HelloWorldIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
