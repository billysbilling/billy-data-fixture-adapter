module.exports = function(grunt) {
    grunt.initConfig({
        'billy-builder': {
            title: 'billy-data-fixture-adapter',
            jshint: true
        }
    });

    grunt.loadNpmTasks('billy-builder');
};