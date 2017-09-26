const request = require("request");
const proxyLists = require("proxy-lists");

// node bot.js baseDomain pollId choiceId
// node bot.js example.com 1234 1

/*
  Welcome to my TotalPoll bot.  This project is not intended to be used with
  malicious intentions and is only a simple reverse engineering of a popular
  WordPress plugin.  Keep in mind that the only reason this works is because
  TotalPoll uses cookies to keep track of users that already voted.  However,
  the plugin does offer the ability to block users by IP address after they
  have voted once already.

  This bot is different and instead sends requests through various proxy
  servers.  The servers are fetched using the proxy-lists dependency and
  the bot iterates over each proxy sending a request.  There apears to be
  a large quantity of duplicate proxies supplied so if IP banning is enabled,
  some requests will likely get denied.  Once again, I take no responsibility
  for nefarious usage of this bot as it only created for educational purposes.
*/

var args = process.argv.splice(process.execArgv.length + 2);

// This is the domain of the WordPress site (without a trailing slash).
const baseDomain = args[0];
// This is the unique id number of the poll.
const pollId = args[1];
// This is the option we want to vote for (values start at zero).
const choiceId = args[2];

// We only want plain old HTTP proxies.
const proxyOptions = {
    protocols: ['http']
};

function sendVote(proxy) {
    const options = {
        // Add the TotalPoll vote handler page tp the base URL.
        url: 'http://' + baseDomain + '/wp-admin/admin-ajax.php',
        // TotalPoll uses POST requests to receive data.
        method: 'POST',
        headers: {
            // Let's tell TotalPoll what format we're using to send our vote.
            'Content-Type': 'multipart/form-data'
        },
        form: {
            /*
               All of the below values can be found by inspecting your target
               poll's source code and looking through the form values.
            */
            'totalpoll[id]': pollId,
            'totalpoll[page]': '1',
            'totalpoll[view]': 'vote',
            'totalpoll[choices][]': choiceId,
            'totalpoll[action]': 'vote',
            'action': 'tp_action'
        },
        // It's just like before but now there's a proxy!
        proxy: `http://${proxy.ipAddress}:${proxy.port}`
    };

    // This function will handle the server's response when we get it.
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Looks like our vote was successful.
            if (body.startsWith('<div id="totalpoll')) {
                console.log('Vote was sent successfully.');
            } else {
                console.error('Vote was unsuccessfully sent due to proxy misconfiguration.');
            }
        } else if(error) {
            // These errors can quickly become very annoying because many of the proxies will drop connection.
            console.error('Proxy unexpectedly dropped connection (we think).');
        } else {
            console.error('Vote was unsuccessfully sent due to proxy misconfiguration.');
        }
    })
}

// Let's fetch all of the proxies that match the above cases.
const fetchingProxies = proxyLists.getProxies(proxyOptions);

// This could (and probably will) use too many event listeners so let's raise the maximum amount.
fetchingProxies.setMaxListeners(64);

// Upon fetching the proxies, pass them to our request sender.
fetchingProxies.on('data', function(proxies) {
    proxies.forEach(sendRequest);
});

// Log any fetching errors.
fetchingProxies.on('error', function(error) {
    console.error(error);
});
