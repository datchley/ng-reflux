module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),    
        browserify: {
            dist: {
                options: {
                    browserifyOptions: {
                        // debug: true,
                        standalone: 'ng-reflux'
                    },
                    transform: [
                        "browserify-shim",
                        ["babelify", { loose: "all" }]
                    ]
                },
                files: {
                    "./dist/reflux-angular.js": ["./src/reflux-angular.js"]
                }
            },
            mixins: {
                options: {
                    browserifyOptions: {
                        debug: true,
                        standalone: 'ImmutableStateMixin'
                    },
                    transform: [
                        ["babelify", { loose: "all" }]
                    ]
                },
                files: {
                    "./dist/immutable-state-mixin.js": ["./src/state-mixin.js"]
                }
            }
        },
        uglify: {
            dist: {
                src: 'dist/reflux-angular.js',
                dest: 'dist/reflux-angular.min.js'
            },
            mixins: {
                src: 'dist/immutable-state-mixin.js',
                dest: 'dist/immutable-state-mixin.min.js'
            }
        },
        jshint: {
            grunt: {
                src: ['Gruntfile.js'],
                options: {
                    node: true
                }
            },
            sources: {
                src: ['src/**/*.js'],
                options: {
                    esnext: true
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-browserify");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-jshint");

    grunt.registerTask("default", ["jshint","browserify","uglify"]);
};
