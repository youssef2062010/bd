package com.fakecall.editor

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File
import java.io.FileNotFoundException

class SharedConfigProvider : ContentProvider() {

    companion object {
        const val AUTHORITY = "com.fakecall.shared.configprovider"
        val CONTENT_URI: Uri = Uri.parse("content://$AUTHORITY/config")
    }

    override fun onCreate(): Boolean = true

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor {
        val cursor = MatrixCursor(arrayOf("config_json"))
        val context = context ?: return cursor
        val sharedDir = File(context.getExternalFilesDir(null)?.parentFile?.parentFile, "com.fakecall.shared")
        val configFile = File(sharedDir, "config.json")

        if (configFile.exists()) {
            cursor.addRow(arrayOf(configFile.readText()))
        }
        return cursor
    }

    override fun getType(uri: Uri): String = "application/json"

    override fun insert(uri: Uri, values: ContentValues?): Uri? {
        val json = values?.getAsString("config_json") ?: return null
        val context = context ?: return null
        val sharedDir = File(context.getExternalFilesDir(null)?.parentFile?.parentFile, "com.fakecall.shared")
        if (!sharedDir.exists()) sharedDir.mkdirs()
        File(sharedDir, "config.json").writeText(json)
        context.contentResolver.notifyChange(uri, null)
        return uri
    }

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0

    override fun update(
        uri: Uri,
        values: ContentValues?,
        selection: String?,
        selectionArgs: Array<out String>?
    ): Int {
        insert(uri, values)
        return 1
    }

    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor? {
        val context = context ?: throw FileNotFoundException("No context")
        val fileName = uri.lastPathSegment ?: throw FileNotFoundException("No file specified")
        val sharedDir = File(context.getExternalFilesDir(null)?.parentFile?.parentFile, "com.fakecall.shared")
        val file = File(sharedDir, fileName)
        if (!file.exists()) throw FileNotFoundException(fileName)
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    }
}
