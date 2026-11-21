<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: the regeneration check after the mission

```plantuml
@startuml
title regeneration › regenerated deps equal the committed file
start
:resolve $ELK_SOURCE_DIR (default ../elk);
if (directory exists?) then (no)
  :skip: ELK source dir not found;
  stop
endif
if (git cat-file -e <elkCommit>^{commit}?) then (fails)
  :skip: checkout does not contain committed elkCommit;
  stop
endif
:git show <elkCommit>:plugins/<bundle>/META-INF/MANIFEST.MF\nfor the 16 in-scope bundles;
:buildBundleDeps(manifests, elkCommit);
:compare object and serialized bytes\nwith test/architecture/bundle-deps.json;
stop
@enduml
```

Before the mission the second test was `HEAD == elkCommit`, and the read was from the working tree.
