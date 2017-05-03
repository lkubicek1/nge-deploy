let schema = {
    properties: {
        name: {
            description: 'Application Name',
            default: 'myApp'
        },
        viewEngine: {
            description: 'Express View <engine> support',
            default: 'jade',
            pattern: /\b^ejs$|\b^hbs$|\b^hjs$|\b^jade$|\b^pug$|\b^twig$|\b^vash$/,
            message: 'Invalid entry, support (ejs|hbs|hjs|jade|pug|twig|vash)'
        },
        fullstack: {
            description: 'Merge server-side and client-side projects',
            default: 'y',
            pattern: /^y$|^n$|^Y$|^N$/,
            message: 'y|n'
        },
        animations: {
            description: 'Add support for animations in Angular',
            default: 'y',
            pattern: /^y$|^n$|^Y$|^N$/,
            message: 'y|n'
        },
        globDep: {
            description: 'Install global dependencies',
            default: 'y',
            pattern: /^y$|^n$|^Y$|^N$/,
            message: 'y|n'
        }
    }
};
let ngDevDependencies = ['i', '--save-dev', '@types/core-js'];


let CORS = `
app.use((req, res, next) => {
 	res.setHeader('Access-Control-Allow-Origin', '*');
   	res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
   	res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
   	next();
});

`;

let errHndlr = `app.use(function(req, res, next) {
  res.render('index');
});

module.exports = app;`;

module.exports = {
    schema,
    ngDevDependencies,
    CORS,
    errHndlr
};