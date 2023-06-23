import React from "react";
import {
  Text,
  TextInput,
  Button,
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { shareAsync } from "expo-sharing";
import * as Notifications from "expo-notifications";
import * as Progress from "react-native-progress";

export default function App() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const [url, setUrl] = React.useState(null);
  const [fileSize, setFileSize] = React.useState(null);
  const [fileType, setFileType] = React.useState(null);
  const [downloaded, setDownloaded] = React.useState(null);
  const [progress, setProgress] = React.useState(null);

  // Hundred notifications are being pushed to user
  // let downloadNotificationId = null;

  // const updateProgress = (progress) => {
  //   // Convert progress to a string
  //   const progressText = `${Math.floor(progress * 100)}%`;

  //   // Create a notification with progress
  //   const notificationContent = {
  //     title: "Download Progress",
  //     body: `Downloading: ${progressText}`,
  //     android: {
  //       channelId: "download-progress",
  //       priority: "high",
  //       sticky: true,
  //     },
  //   };

  //   if (downloadNotificationId) {
  //     // Cancel the previous notification
  //     Notifications.cancelScheduledNotificationAsync(downloadNotificationId)
  //       .then(() => {
  //         // Create a new notification
  //         Notifications.scheduleNotificationAsync({
  //           content: notificationContent,
  //           trigger: null, // Trigger immediately
  //         })
  //           .then((notificationRequest) => {
  //             downloadNotificationId = notificationRequest.identifier;
  //           })
  //           .catch((error) => {
  //             console.log("Error scheduling notification:", error);
  //           });
  //       })
  //       .catch((error) => {
  //         console.log("Error cancelling notification:", error);
  //       });
  //   } else {
  //     // Create a new notification
  //     Notifications.scheduleNotificationAsync({
  //       content: notificationContent,
  //       trigger: null, // Trigger immediately
  //     })
  //       .then((notificationRequest) => {
  //         downloadNotificationId = notificationRequest.identifier;
  //       })
  //       .catch((error) => {
  //         console.log("Error scheduling notification:", error);
  //       });
  //   }
  // };

  const updateProgress = (progress) => { 

    // Create a notification with progress bar
    const notificationContent = {
      title: 'Download Progress',
      body: `Downloading: ${Math.trunc(progress*100)}%`,
    };

    // Schedule the notification
    Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Trigger immediately
    });
  };

  const callback = (downloadProgress) => {
    const progress =
      downloadProgress.totalBytesWritten /
      downloadProgress.totalBytesExpectedToWrite;
    console.log(downloadProgress, progress);
    setDownloaded(downloadProgress.totalBytesWritten);
    setProgress(progress);
    if (progress >= 1 || progress < 0) {
      setDownloaded(0);
      setProgress(null);
    }
    updateProgress(progress);
  };

  const downloadFromUrl = async () => {
    Keyboard.dismiss();
    var filename = url.split("/").pop();
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      FileSystem.documentDirectory + filename,
      {},
      callback
    );

    Notifications.scheduleNotificationAsync({
      content: {
        title: "Downloading",
        // body: `Downloading: ${Math.trunc(progress*100)}%`,
      },
      trigger: null,
    });

    try {
      const result = await downloadResumable.downloadAsync();
      console.log("Finished downloading to ", result.uri);
      save(result.uri, filename, result.headers["Content-Type"]);
    } catch (e) {
      console.error(e);
    }
  };

  const save = async (uri, filename, mimetype) => {
    if (Platform.OS === "android") {
      const permission =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permission.granted) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.StorageAccessFramework.createFileAsync(
          permission.directoryUri,
          filename,
          mimetype
        )
          .then(async (uri) => {
            await FileSystem.writeAsStringAsync(uri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            Notifications.scheduleNotificationAsync({
              content: {
                title: "Downloaded",
                body: "File has been downloaded successfully!",
              },
              trigger: null,
            });
          })
          .catch((e) => console.log(e));
      } else {
        shareAsync(uri);
      }
    } else {
      shareAsync(uri);
    }
  };

  const getFileInfo = async () => {
    Keyboard.dismiss();
    var filename = url.split("/").pop();
    const result = await FileSystem.downloadAsync(
      url,
      FileSystem.documentDirectory + filename
    );

    setFileType(result.headers["Content-Type"]);
    setFileSize(result.headers["Content-Length"]);
  };

  return (
    <View style={styles.container}>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: 25, textAlign: "center" }}>
          React Native File Download Example
        </Text>
      </View>
      <TouchableOpacity>
        <TextInput
          onChangeText={setUrl}
          value={url}
          style={styles.textInput}
          placeholder="url"
        />
      </TouchableOpacity>
      <Button color="#9C9C9C" title="File Information" onPress={getFileInfo} />
      <Text style={styles.text}>File Size: {fileSize}</Text>
      <Text style={styles.text}>File Type: {fileType}</Text>
      <Button color="#9C9C9C" title="Download" onPress={downloadFromUrl} />
      <Text style={styles.text}>Downloaded: {downloaded}</Text>
      {progress && <Progress.Bar progress={progress} />}
      <StatusBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  text: {
    fontSize: 20,
    textAlign: "center",
    margin: 10,
  },
  button: {
    width: "80%",
    padding: 10,
    margin: 10,
    backgroundColor: "grey",
  },
  textInput: {
    textAlign: "center",
    backgroundColor: "#F0F0F0",
    borderBottomColor: "black",
    borderBottomWidth: 1,
    borderStyle: "solid",
    width: 200,
    margin: 10,
  },
});
