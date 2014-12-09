## Step 1

[gulp.js](http://gulpjs.com/)をインストール



## Step 2

package.jsonのある場所で

```sh
$ npm install
```

## Step 3

module-config.jsonを編集

```json
{
  "version": "0.0.0",
  "organisation": "kyusyukeigo",
  "module": "MyFirstModule",
  "packageType": "UnityExtension",
  "unityversions": [
    "4.6",
    "5.0"
  ]
}
```

キー|説明
:---|:---
version| モジュールのバージョン
organisation|組織名
module|モジュール名
packageType| UnityExtension固定
unityversions| 使用できるUnityパージョン

## Step 4

```sh
$ glup
```
これでwatch状態になります

## Step 5

スクリプトを編集。コンパイルされるごとにモジュール用のDLLが生成されます。
生成先はbuildフォルダ。