/*
  a very simple implementation of bi-directional chat module for platformOS
  that uses WebSockets and Action Cable library to handle them

  https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
  https://www.npmjs.com/package/actioncable
*/



// imports
// ------------------------------------------------------------------------
import consumer from "./consumer";
import apiFetch from '../../../../src/js/apiFetch'


// purpose:		handles sending and receiving messages as well as the inbox page
// ************************************************************************
const chat = function(){

  // cache 'this' value not to be overwritten later
  const module = this;

  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
  module.settings = {};
  // do you want to enable debug mode that logs to console (bool)
  module.settings.debug = false;
  // the main container with the chat inbox (dom node)
  module.settings.inbox = document.querySelector('#chat-inbox');
  // the input for typing new message (dom node)
  module.settings.messageInput = document.querySelector('#chat-messageInput');
  // the send icon beside chat box
  module.settings.messageInputSendChat = document.querySelector('#send_chat');
  // the box that contains the messages list and that can scroll (dom node)
  module.settings.messagesListContainer = document.querySelector('#chat-messagesList-container');
  // the box with all the messages stored (dom node)
  module.settings.messagesList = document.querySelector('#chat-messagesList');
  // the html template for the single message (function that returns template literal);
  module.settings.messageTemplate = data => {
    let date = new Date(data.created_at);

    return `
    <li class="flex mb-2 break-words ${ data.status === 'sent' ? 'justify-end' : 'justify-start' }">
      <div class="max-w-full rounded py-2 px-3 ${ data.status === 'sent' ? 'bg-indigo-200' : 'bg-gray-300' }">
        <p class="text-sm mt-1">${data.message}</p>
        <p class="text-right text-xs text-gray-500 mt-1">${date.getHours()}:${date.getMinutes()}</p>
      </div>
    </li>
    `
  };
  // the id of the currently logged user (string)
  module.settings.currentUserId = module.settings.messageInput.getAttribute('data-current-profile-id');
  // the loading indicator when loading messages (dom node)
  module.settings.loadingIndicator = document.querySelector('#chat-loadingIndicator');
  // current page of messages (int)
  module.settings.currentPage = 1;
  // are there more pages (bool)
  module.settings.morePages = module.settings.loadingIndicator.dataset.more === 'true';
  // the message that will appear when the connection is lost
  module.settings.lostConnection = module.settings.inbox.getAttribute('data-error-connection');

  // the channel to send messages through (Action Cable channel)
  module.channel = null;
  // the id for the conversation (string)
  module.conversationId = module.settings.messageInput.getAttribute('data-conversation-id');
  // the message that will appear when something fails
  module.errorNotification = null;


  // purpose:		escapes the html to a browser-safe string
  // arguments:	a html string to be escaped (string/html)
  // returns:		a browser-safe string
  // ------------------------------------------------------------------------
  function encodeHtml(string){
    var element = document.createElement('div');
    element.innerText = element.textContent = string;
    string = element.innerHTML;
    return string;
  };


  // purpose:		measures the height of the screen and fits the inbox
  // ------------------------------------------------------------------------
  const resizeInbox = () => {
    module.settings.inbox.style.height = `calc(100vh - ${module.settings.inbox.offsetTop}px - 0)`;
  };


  // purpose:		scrolls the chat window to the bottom
  // ------------------------------------------------------------------------
  const scrollBottom = () => {
    module.settings.messagesListContainer.scrollTo(0, module.settings.messagesList.scrollHeight);
  };


  // purpose:		creates a subscription to a room between users
  // returns:		triggers a 'message' event on document when new message
  //				    appears on the channel (send or received), passess the message details
  // ------------------------------------------------------------------------
  module.createSubscription = () => {
    module.channel = consumer.subscriptions.create(
      {
        channel: 'conversate',
        room_id: module.conversationId,
        sender_name: module.settings.messageInput.getAttribute('data-from-name'),
        autor_id: module.settings.messageInput.getAttribute('data-current-profile-id'),
      },
      {
        received: function(data){
          module.showMessage(Object.assign(data, { status: (module.settings.currentUserId == data.autor_id) ? 'sent' : 'received'}));
          //document.dispatchEvent(new CustomEvent('message', {detail: Object.assign(data, { status: (module.settings.currentUserId == data.autor_id) ? 'sent' : 'received'})}));

          if(module.settings.debug){
            console.log('[Inbox] Message received');
            console.log(data);
          }
        },

        connected: function(){
          module.settings.messageInput.disabled = false;
          module.settings.messageInput.focus();

          // remove the error notification when connected
          if(module.errorNotification){
            module.errorNotification.hide();
          }

          if(module.settings.debug){
            console.log(`[Inbox] Connected to channel and joined room ${module.conversationId}`);
          }
        },

        rejected: function(){
          module.blocked();

          if(module.settings.debug){
            console.log(`[Inbox] The connection was rejected by the server`);
          }
        },

        disconnected: function(){
          module.blocked();

          if(module.settings.debug){
            console.log(`[Inbox] You've been disconnected from the server`);
          }
        }
      }
    );
  };


  // purpose:		sends the message through the Action Cable
  // arguments:	the message to send (string)
  // ------------------------------------------------------------------------
  module.sendMessage = (message) => {
    let messageData = {
      message: encodeHtml(message),
      autor_id: module.settings.currentUserId,
      sender_name: module.settings.messageInput.getAttribute('data-from-name'),
      created_at: new Date()
    };

    module.channel.send(Object.assign(messageData, { create: true }));

    if(module.settings.debug){
      console.log('[Inbox] Message sent');
      console.log(messageData);
    }
  };


  // purpose:		appends a message to the chat box
  // arguments:	all the message data that needs to be shown
  //				    according to the template in messageTemplate (object)
  // ------------------------------------------------------------------------
  module.showMessage = (messageData) => {
    module.settings.messagesList.insertAdjacentHTML('beforeend', module.settings.messageTemplate(messageData));
    console.log(messageData);
    console.log(messageData.status);

    if(module.settings.debug){
      console.log('[Inbox] Message shown in chat');
    }

    if (messageData.status == 'received') {
      
      return apiFetch('/api/read_message', {
        body: JSON.stringify({ msgDetails: { 
          autor_id: messageData.autor_id, 
          create: messageData.create,
          created_at: messageData.created_at, 
          message: messageData.message,
          sender_name: messageData.sender_name, 
          status: messageData.status
        } })
      });
      
    }
  };


  // purpose:		loads messages from given page
  // arguments:	the page number (int, default: 1)
  //            items per page to get (int, default: 30)
  // ------------------------------------------------------------------------
  module.loadPage = (page = 1, perPage = 30) => {
    let latestMessage = module.settings.messagesList.querySelector('li:first-child');

    // show the loading indicator at start
    module.settings.loadingIndicator.style.display = 'block';

    // get the data
    fetch(`/api/chat/messages.json?conversation_id=${module.conversationId}&page=${page}&per_page=${perPage}`)
    .then(response => {
      // parse it to JSON if valid
      if(response.ok){
        return response.json();
      } else {
        return Promise.reject(response);
      }
    })
    .then((data) => {
      // construct HTML elements for messages
      let html = '';

      Object.entries(data.results).reverse().forEach(([key, data]) => {
        data = Object.assign(data, { status: (module.settings.currentUserId == data.autor_id) ? 'sent' : 'received'});

        html += module.settings.messageTemplate(data);
      });

      // put the messages on top
      module.settings.messagesList.insertAdjacentHTML('afterbegin', html);

      // disable loading next pages if there is nothing left
      if(!data.has_next_page){
        module.settings.morePages = false;
      }
    })
    .catch((error) => {
      console.log(error);
      error.json().then(data => console.log(data));
    })
    .finally(() => {
      // remove the loading indicator
      module.settings.loadingIndicator.style.display = 'none';
      // scroll to the last seen message
      module.settings.messagesListContainer.scrollTop = latestMessage.offsetTop - 300;
    });
  };


  // purpose:		blocks the chat when there is a critical error
  // ------------------------------------------------------------------------
  module.blocked = () => {
    module.settings.messageInput.disabled = true;
    module.errorNotification = new api.flash('error', 'We cannot connect to the server. Check your internet connection or try reloading the page.');
  };


  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = () => {
    // resize the inbox to the screen
    resizeInbox();

    // create subscription for the channel
    module.createSubscription();

    // scroll to bottom after loading the messages
    scrollBottom();

    // handling what will happen on pressing enter in the input
    module.settings.messageInput.addEventListener('keypress', (event) => {
      if(event.key === 'Enter' && module.settings.messageInput.value.trim()){
        module.sendMessage(module.settings.messageInput.value.trim());
        module.settings.messageInput.value = '';
      }
    });

    // handling what will happen on clicking on send message icon
    module.settings.messageInputSendChat.addEventListener('click', (event) => {
        module.sendMessage(module.settings.messageInput.value.trim());
        module.settings.messageInput.value = '';
    });

    // what will happen when new message appears in channel
    document.addEventListener('message', event => {
      throw new Error('test' + JSON.stringify(event) + JSON.stringify(event.details));
      module.showMessage(event.detail);
      scrollBottom();

      // if(event.detail.status === 'sent'){
      //   document.chatNotifications.send(event.detail.to_id, event.detail);
      // }
    });

    // load previous messages when user scrolls to top
    let messagesListTimeout = '';
    module.settings.messagesListContainer.addEventListener('scroll', () => {
      if(module.settings.morePages === true){
        clearTimeout(messagesListTimeout);
        messagesListTimeout = setTimeout(() => {
          if(module.settings.messagesListContainer.scrollTop === 0){
            module.settings.currentPage = module.settings.currentPage + 1;
            module.loadPage(module.settings.currentPage);
          }
        }, 300);
      }
    });

  };

  module.init();

};

document.addEventListener('DOMContentLoaded', () => {
  if(document.querySelector('#chat-messagesList-container')){
    document.chat = new chat();
  }
});



// purpose:		handles the behavior of 'send message' button
// argumenst: configurable settings (object)
// ************************************************************************
const sendMessageButton = function(userSettings){

	// cache 'this' value not to be overwritten later
	const module = this;


  // purpose:		settings that are being used across the module
  // ------------------------------------------------------------------------
	module.settings = {};
	// the 'send message' button (dom node)
  module.sendMessageButton = userSettings.sendMessageButton ? userSettings.sendMessageButton : document.querySelector('.chat-sendMessage');


  // purpose:		blocks the button after first click to prevent
  //            cloning the conversations to a single user
  // ------------------------------------------------------------------------
  module.preventDoubleClick = () => {
    module.sendMessageButton.addEventListener('click', (event) => {
      module.sendMessageButton.setAttribute('disabled', 'disabled');
    });
  };


  // purpose:		initializes the module
  // ------------------------------------------------------------------------
  module.init = () => {
    module.preventDoubleClick();
  };

  module.init();

};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.chat-sendMessage').forEach((item) => {
    new sendMessageButton({
      sendMessageButton: item
    });
  });
});
