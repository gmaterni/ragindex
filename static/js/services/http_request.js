/** @format */
"use strict";

export async function requestGet(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const text = new TextDecoder("utf-8").decode(arrayBuffer);
    return text;
  } catch (error) {
    console.error(`Error in requestGet() for url: ${url}`, error);
    let message;
    if (error.message.includes("HTTP error! status")) {
      message = error.message;
    } else if (error.message.includes("NetworkError")) {
      message = "Network error occurred";
    } else {
      message = "An unknown error occurred";
    }
    alert(`requestGet()\nurl: ${url}\n${message}`);
    throw error;
  }
}


