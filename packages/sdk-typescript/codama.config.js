export default {
    idl: '../../target/idl/ghostspeak_marketplace.json',
    before: [],
    scripts: {
        js: {
            from: '@codama/renderers-js',
            args: [
                'src/generated'
            ]
        }
    }
}
