var fs      = require('fs'),
chalk       = require('chalk'),
plist       = require('plist'),
shell       = require('shelljs'),
fileHound   = require('filehound'),
resolve     = require('path').resolve,
xcode       = require('xcode');

module.exports = function(context) {

	if (fs.existsSync('platforms/ios/ios.json')) {
	    
	    var path = require('os').homedir() + '/MAS_Config/msso_config.json';

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

                    console.log('\n' + 'Successfully configured authorization for iOS location services.' + '\n');
                });
            });


		//
        //  Configure MAS iOS project with msso_config.json.
        //  Add Run script to remove the simulator file that is required to successfully deploy your app to the Apple Store.
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

		                //
                        //  Add the msso_config.json to resources directory of the XCode project.
                        //
                        appProj.addResourceFile(path);

                        //
                        //  Add the XCode proejct buildPhase 'Run Script' Shell script.
                        //  The script removes the simulator file that is required to successfully deploy your app to the Apple Store.
                        //
                        var script = "APP_PATH=\"${TARGET_BUILD_DIR}/${WRAPPER_NAME}\"\n\n# This script loops through the frameworks embedded in the application and\n# removes unused architectures.\nfind \"$APP_PATH\" -name '*.framework' -type d | while read -r FRAMEWORK\ndo\nFRAMEWORK_EXECUTABLE_NAME=$(defaults read \"$FRAMEWORK/Info.plist\" CFBundleExecutable)\nFRAMEWORK_EXECUTABLE_PATH=\"$FRAMEWORK/$FRAMEWORK_EXECUTABLE_NAME\"\necho \"Executable is $FRAMEWORK_EXECUTABLE_PATH\"\n\nEXTRACTED_ARCHS=()\n\nfor ARCH in $ARCHS\ndo\necho \"Extracting $ARCH from $FRAMEWORK_EXECUTABLE_NAME\"\nlipo -extract \"$ARCH\" \"$FRAMEWORK_EXECUTABLE_PATH\" -o \"$FRAMEWORK_EXECUTABLE_PATH-$ARCH\"\nEXTRACTED_ARCHS+=(\"$FRAMEWORK_EXECUTABLE_PATH-$ARCH\")\ndone\n\necho \"Merging extracted architectures: ${ARCHS}\"\nlipo -o \"$FRAMEWORK_EXECUTABLE_PATH-merged\" -create \"${EXTRACTED_ARCHS[@]}\"\nrm \"${EXTRACTED_ARCHS[@]}\"\n\necho \"Replacing original executable with thinned version\"\nrm \"$FRAMEWORK_EXECUTABLE_PATH\"\nmv \"$FRAMEWORK_EXECUTABLE_PATH-merged\" \"$FRAMEWORK_EXECUTABLE_PATH\"\n\ndone";
                        var options = {shellPath: '/bin/sh', shellScript: script};
                        var buildPhase = appProj.addBuildPhase([], 'PBXShellScriptBuildPhase', 'Run a script', appProj.getFirstTarget().uuid, options).buildPhase;

		                fs.writeFileSync(file, appProj.writeSync());

		                console.log('\n' + 'Successfully configured ' + ' cordova project with : ' + path + '\n');
		            });
		        });
		    });
	}
};