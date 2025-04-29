#!/bin/bash

# Update all SCSS files from @import to @use
find src -type f -name "*.scss" -exec sed -i '' -e 's/@import .\.\.\/\.\.\/styles\/variables\.scss.;/@use "..\/..\/styles\/variables.scss" as variables;/g' {} \;
find src -type f -name "*.scss" -exec sed -i '' -e 's/@import .\.\.\/\.\.\/styles\/mixins\.scss.;/@use "..\/..\/styles\/mixins.scss" as mixins;/g' {} \;

echo "All SCSS files updated to use @use instead of @import"