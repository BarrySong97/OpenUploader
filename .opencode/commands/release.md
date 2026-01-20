---
description: Generate release script for version bump, build, and GitHub publish
---

Generate a complete bash script that automates the release process with the following steps:

**Version Type**: Use argument $1 (patch/minor/major), default to 'patch' if not provided

**Script Requirements**:

1. Check for uncommitted changes - exit if found
2. Run `npm version $VERSION_TYPE --no-git-tag-version` to bump version
3. Extract new version: `NEW_VERSION=$(node -p "require('./package.json').version")`
4. Ask user for confirmation before proceeding
5. Git operations:
   - Commit package.json: `git commit -m "chore: bump version to v$NEW_VERSION"`
   - Create tag: `git tag "v$NEW_VERSION"`
   - Push: `git push origin main && git push origin "v$NEW_VERSION"`
6. Build: `pnpm build:prod:win`
7. Verify artifacts exist:
   - `./dist/open-uploader-$NEW_VERSION-setup.exe`
   - `./dist/open-uploader-$NEW_VERSION-setup.exe.blockmap`
   - `./dist/latest.yml` (CRITICAL for auto-update)
8. Generate Release Notes from git commits:

   ```bash
   # Get previous tag (the tag before HEAD)
   PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || git rev-list --max-parents=0 HEAD)

   echo "📝 Generating release notes from $PREV_TAG to v$NEW_VERSION..."

   # Get all commit messages between previous tag and new version
   COMMITS=$(git log ${PREV_TAG}..HEAD --pretty=format:"%s" --no-merges)

   # Initialize release notes
   RELEASE_NOTES=""

   # Extract and format FEATURES
   FEATURES=$(echo "$COMMITS" | grep "^feat" || true)
   if [ -n "$FEATURES" ]; then
     RELEASE_NOTES+="## ✨ Features\n\n"
     while IFS= read -r line; do
       # Remove "feat" prefix and scope, keep the description
       MSG=$(echo "$line" | sed -E 's/^feat(\([^)]+\))?: */- /')
       RELEASE_NOTES+="$MSG\n"
     done <<< "$FEATURES"
     RELEASE_NOTES+="\n"
   fi

   # Extract and format BUG FIXES
   FIXES=$(echo "$COMMITS" | grep "^fix" || true)
   if [ -n "$FIXES" ]; then
     RELEASE_NOTES+="## 🐛 Bug Fixes\n\n"
     while IFS= read -r line; do
       MSG=$(echo "$line" | sed -E 's/^fix(\([^)]+\))?: */- /')
       RELEASE_NOTES+="$MSG\n"
     done <<< "$FIXES"
     RELEASE_NOTES+="\n"
   fi

   # Extract OTHER changes (chore, refactor, docs, etc.)
   OTHERS=$(echo "$COMMITS" | grep -vE "^(feat|fix)" || true)
   if [ -n "$OTHERS" ]; then
     RELEASE_NOTES+="## 🔧 Other Changes\n\n"
     while IFS= read -r line; do
       # Keep the type prefix for other changes
       MSG=$(echo "$line" | sed -E 's/^/- /')
       RELEASE_NOTES+="$MSG\n"
     done <<< "$OTHERS"
   fi

   # Preview release notes
   echo "📋 Release Notes Preview:"
   echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
   echo -e "$RELEASE_NOTES"
   echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
   ```

9. Create GitHub Release:
   ```bash
   gh release create "v$NEW_VERSION" \
     --title "Open Uploader v$NEW_VERSION" \
     --notes "$(echo -e "$RELEASE_NOTES")" \
     ./dist/open-uploader-$NEW_VERSION-setup.exe \
     ./dist/open-uploader-$NEW_VERSION-setup.exe.blockmap \
     ./dist/latest.yml
   ```
10. Show success message with release URL

**Script Features**:

- Use `set -e` for error handling
- Include progress emojis (🔍 📦 ✅ ❌ etc.)
- Save as `release-v$NEW_VERSION.sh`
- Make executable with `chmod +x`
- Repository: BarrySong97/OpenUploader
- Main branch: main

**Example Usage**:

```bash
./release-v1.0.3.sh patch  # 1.0.2 → 1.0.3
./release-v1.1.0.sh minor  # 1.0.2 → 1.1.0
./release-v2.0.0.sh major  # 1.0.2 → 2.0.0
```

Generate the complete, production-ready script now.
