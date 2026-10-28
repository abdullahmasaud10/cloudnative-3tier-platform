#!/bin/bash
cd /home/abdullah/umer-pansar
git add -A
git commit -m "chore: sanitize codebase, enforce CI quality gate, and publish enterprise README"
git push origin main
rm -f /home/abdullah/umer-pansar/push.sh
