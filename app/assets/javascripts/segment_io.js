window.analytics||(window.analytics=[]),window.analytics.methods=["identify","track","trackLink","trackForm","trackClick","trackSubmit","page","pageview","ab","alias","ready","group","on","once","off"],window.analytics.factory=function(t){return function(){var a=Array.prototype.slice.call(arguments);return a.unshift(t),window.analytics.push(a),window.analytics}};for(var i=0;i<window.analytics.methods.length;i++){var method=window.analytics.methods[i];window.analytics[method]=window.analytics.factory(method)}window.analytics.load=function(t){var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=("https:"===document.location.protocol?"https://":"http://")+"d2dq2ahtl5zl1z.cloudfront.net/analytics.js/v1/"+t+"/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(a,n)},window.analytics.SNIPPET_VERSION="2.0.8",
window.analytics.load("5ack5tsuvw");
window.analytics.page();

setTimeout(function(){
    if(chorus.session && chorus.session.attributes && chorus.session.attributes.user) {
        analytics.identify(chorus.session.attributes.user.id, {
            email: chorus.session.attributes.user.email,
            firstName: chorus.session.attributes.user.firstName,
            lastName: chorus.session.attributes.user.lastName, userName: chorus.session.attributes.user.username
        });
    };
}, 500);  // give it some time to load the chorus session