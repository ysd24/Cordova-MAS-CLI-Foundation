var fs          = require('fs'),
    chalk       = require('chalk'),
    plist       = require('plist'),
    shell       = require('shelljs'),
    fileHound   = require('filehound'),
    resolve     = require('path').resolve,
    xcode       = require('node-xcode-opifex');

module.exports = function(ctx) {

    // Get the absolute path.
        var path = resolve('~/MAS_Config/msso_config.json');
      
        // Abort if the msso config path doesn't exist...
        if (!fs.existsSync(path)) {

            console.log('\n' + 'Config file does not exist @ path : ' + path + '\n');

            return;
        }

        //
        //  Configure authorization for location services. 
        //
        fileHound.create()
            .paths('./platforms/ios/')
            .depth(0)
            .ext('plist')
            .match('*Info*')
            .find()
            .then(files => {
                files.forEach(file => {
                    var infoPlist = plist.parse(fs.readFileSync(file, 'utf8'));
                    
                    infoPlist.NSLocationWhenInUseUsageDescription =
                        infoPlist.NSLocationAlwaysUsageDescription =
                        infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription =
                        'The application requires location services to connect to MAS backend services.';
                    
                    fs.writeFileSync(file, plist.build(infoPlist));

                    program.successMessage('\n' + 'Successfully configured authorization for iOS location services.' + '\n');
                });
            });

        //
        //  Configure MAS iOS project with msso_config.json.
        //
        fileHound.create()
            .paths('./platforms/ios/')
            .depth(0)
            .ext('pbxproj')
            .find()
            .then(files => {
                files.forEach(file => {
                    var appProj = xcode.project(file);
                    
                    appProj.parse(function (err) {

                        appProj.addResourceFile(path);

                        fs.writeFileSync(file, appProj.writeSync());

                        program.handleSuccess('\n' + 'Successfully configured ' + platform + ' cordova project with : ' + path + '\n');
                    });
                });
            });
    }
};