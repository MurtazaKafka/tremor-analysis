#!/bin/bash
# Build the React app
npm run build

# Start the production server
npx serve -s build -l $PORT
