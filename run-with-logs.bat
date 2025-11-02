@echo off
echo Running test and saving output to error-log.txt...
npm test > error-log.txt 2>&1
echo Done! Check error-log.txt for the output
type error-log.txt
pause

