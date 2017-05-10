let spawn = require('cross-spawn');
let fs = require('fs');
let prompt = require('prompt');
let ncp = require('ncp');
let rimraf = require('rimraf');
let config = require('./config');

let appParams = {};
let buildDir = 'build';

prompt.start();
prompt.get(config.schema, installGlobalDependencies);

function installGlobalDependencies (err, result){
    if (err){
        console.log('There was a problem with your input: ' + err);
    } else {
        appParams = result;
        if (appParams.globDep.toLowerCase() === 'y') {
            console.log('Installing global dependencies...');
            let globalDep = spawn('npm', ['i', '-g', 'express-generator', '@angular/cli'], {stdio: 'inherit'});

            // buildDir += appParams.name;
            globalDep.on('close', makeBuildDir);
        } else {
            makeBuildDir();
        }
    }
}

function makeBuildDir(code){
    if (code === 1) {
        console.log('Global dependency installation failed.  Terminating process.')
        //TODO: roll back project
    } else {
        let mkdir = spawn('mkdir', [buildDir], {stdio: 'inherit'});
        mkdir.on('close', buildServer);
    }
}

function buildServer (code){
    if (code === 1) {
        console.log('Failed to create build directory')
        //TODO: roll back project
    } else {
        let viewArg = '--view=' + appParams.viewEngine;
        console.log('installing express application....');
        let expressGen = spawn('express', [viewArg, appParams.name], {cwd: buildDir, stdio: 'inherit'});
        expressGen.on('close', prepServer);
    }
}

function prepServer(code){
    if (code === 1) {
        console.log('Express project generation failed.  Terminating process.')
        //TODO: roll back project
    } else {
        fs.renameSync(buildDir + '/' + appParams.name, buildDir + '/' + appParams.name + '-server');
        fs.renameSync(buildDir + '/' + appParams.name + '-server/app.js', buildDir + '/' + appParams.name + '-server/app.js.orig');
        let foundRoute = false;
        let foundErrHndlr = false;
        fs.readFileSync(buildDir + '/' + appParams.name + '-server/app.js.orig').toString().split('\n').forEach((line) => {
            if (line.includes(`app.use('/',`) && !foundRoute) {
                foundRoute = true;
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', config.CORS);
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', `app.use('/', appRoutes);` + "\n");
            } else if (line.includes(`app.set('views'`)){
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', '//' + line.toString() + "\n");
            } else if (line.includes(`app.set('view engine'`)){
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', '//' + line.toString() + "\n");
            } else if (line.includes(`var users = require('./routes/users');`)){
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', '//' + line.toString() + "\n");
            } else if (line.includes(`app.use('/users', users);`)){
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', '//' + line.toString() + "\n");
            } else if (line.includes(`var index = require('./routes/index');`)) {
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', `var appRoutes = require('./routes/app');` + "\n");
            } else if (line.includes(`app.use(function(req, res, next)`) && !foundErrHndlr){
                foundErrHndlr = true;
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', config.errHndlr);
            } else if (!foundErrHndlr) {
                fs.appendFileSync(buildDir + '/' + appParams.name + '-server/app.js', line.toString() + "\n");
            }
        });
        fs.renameSync(buildDir + '/' + appParams.name + '-server/routes/index.js', buildDir + '/' + appParams.name + '-server/routes/app.js');

        let ngNew = spawn('ng', ['new', appParams.name], {stdio: 'inherit'});
        ngNew.on('close', moveNgProj);
    }
}

function moveNgProj(code){
    if (code === 1) {
        console.log('Angular project creation failed.  Terminating process.')
        //TODO: roll back project
    } else {
        console.log('Moving Angular Project to build directory...');
        ncp(appParams.name, buildDir + '/' + appParams.name, addDevDependencies);
    }

}

function addDevDependencies (err){
    if (err) {
        console.log('Angular project move failed.  Terminating process.')
        //TODO: roll back project
    } else {
        rimraf(appParams.name, [null], (err) => {
            if (err){
                console.log('Project directory failed cleanup!')
            } else {
                console.log('Project directory cleaned.');
            }
        });
        let ngNpmDevDep = spawn('npm', config.ngDevDependencies, {cwd: buildDir + '/' + appParams.name, stdio: 'inherit'});
        ngNpmDevDep.on('close', addProdDependancies);
    }
}

function addProdDependancies(code) {
    if (code === 1) {
        console.log('Angular Dev-Dependencies installation failed.  Terminating process.')
        //TODO: roll back project
    } else {
        let ngProdDependencies = ['i', '--save'];
        if (appParams.animations.toLowerCase() === 'y') {
            ngProdDependencies.push('@angular/animation');
        }
        if (ngProdDependencies.length > 2) {
            let ngNpmProdDep = spawn('npm', ngProdDependencies, {cwd: buildDir + '/' + appParams.name, stdio: 'inherit'});
            ngNpmProdDep.on('close', mergeProjects);
        } else {
            mergeProjects();
        }
    }
}

function mergeProjects (code){
    if (code === 1) {
        console.log('Angular Dev-Dependencies installation failed.  Terminating process.')
        //TODO: roll back project
    } else {
        if (appParams.fullstack.toLowerCase() === 'y') {
            let serverPackage = JSON.parse(fs.readFileSync(buildDir + '/' + appParams.name + '-server/package.json', 'utf8'));
            let ngPackage = JSON.parse(fs.readFileSync(buildDir + '/' + appParams.name + '/package.json', 'utf8'));
            let ngCliConfig = JSON.parse(fs.readFileSync(buildDir + '/' + appParams.name + '/.angular-cli.json', 'utf8'));
            fs.unlinkSync(buildDir + '/' + appParams.name + '/package.json');
            fs.unlinkSync(buildDir + '/' + appParams.name + '-server/package.json');
            fs.unlinkSync(buildDir + '/' + appParams.name + '/.angular-cli.json');

            Object.assign(ngPackage['scripts'], serverPackage['scripts']);
            Object.assign(ngPackage['dependencies'], serverPackage['dependencies']);
            Object.assign(ngPackage['devDependencies'], serverPackage['devDependencies']);

            ngCliConfig.apps[0].outDir = "public";
            fs.writeFileSync(buildDir + '/' + appParams.name + '/package.json', JSON.stringify(ngPackage, null, '\t'));
            fs.writeFile(buildDir + '/' + appParams.name + '/.angular-cli.json', JSON.stringify(ngCliConfig, null, '\t'), copyDir);
        } else {
            let npmInstall = spawn('npm', ['i'], {cwd: buildDir + '/' + appParams.name + '-server', stdio: 'inherit'});
            npmInstall.on('close', console.log('Project Generation Complete!'));
        }
    }
}

function copyDir(err){
    if (err) {
        return console.log(err);
    }
    console.log("Saved package.json.");
    ncp(buildDir + '/' + appParams.name + '-server', buildDir + '/' + appParams.name, cleanUp);
}

function cleanUp(err){
    if (err) {
        console.log(err);
    } else {
        let npmInstallNg = spawn('npm', ['i'], {cwd: buildDir + '/' + appParams.name, stdio: 'inherit'});
        rimraf(buildDir + '/' + appParams.name + '-server', [null], (err) => {
            if (err) {
                console.log('Unable to delete stand-alone server directory: ' + err)
            } else {
                console.log('Stand-alone server directory removed!')
            }
        });
        //npmInstallNg.on('close', console.log('Project Generation Complete!'));
    }
}
//TODO: add option to remove global dependencies (ie clean install)

