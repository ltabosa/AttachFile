﻿'use strict';

ExecuteOrDelayUntilScriptLoaded(initializePage, "sp.js");//adicionar na pagina de novo TS e tbm na pagina de edicao de TS
ExecuteOrDelayUntilScriptLoaded(getWebProperties, "SP.js");//adicionar na pagina de edicao de timesheet

function initializePage() {
    ///******************************************************************************
    
    $("#uploadDocumentButton").click(function () {
        var listTitle = 'AttachmentList';
        var itemId = 1;
        var fileInput = document.getElementById("customFileUploadControl");
        var file = fileInput.files[0];
        processUpload(file, listTitle, itemId,
          function () {
              console.log('Attachment file has been uploaded');
              location.reload();
          },
          function (sender, args) {
              console.log(args.get_message());
          });
    });

    function processUpload(fileInput, listTitle, itemId, success, error) {
        var reader = new FileReader();
        reader.onload = function (result) {
            var fileContent = new Uint8Array(result.target.result);
            performAttachmentUpload(listTitle, fileInput.name, itemId, fileContent, success, error);
        };
        reader.readAsArrayBuffer(fileInput);
    }


    function performAttachmentUpload(listTitle, fileName, itemId, fileContent, success, error) {

        ensureAttachmentFolder(listTitle, itemId,
           function (folder) {
               var attachmentFolderUrl = folder.get_serverRelativeUrl();
               uploadFile(attachmentFolderUrl, fileName, fileContent, success, error);
           },
           error);
    }

    function ensureAttachmentFolder(listTitle, itemId, success, error) {
        var ctx = SP.ClientContext.get_current();
        var web = ctx.get_web();
        var list = web.get_lists().getByTitle(listTitle);
        ctx.load(list, 'RootFolder');
        var item = list.getItemById(itemId);
        ctx.load(item);
        ctx.executeQueryAsync(
          function () {
              var attachmentsFolder;
              if (!item.get_fieldValues()['Attachments']) { /* Attachments folder exists? */
                  var attachmentRootFolderUrl = String.format('{0}/Attachments', list.get_rootFolder().get_serverRelativeUrl());
                  var attachmentsRootFolder = ctx.get_web().getFolderByServerRelativeUrl(attachmentRootFolderUrl);
                  //Note: Here is a tricky part. 
                  //Since SharePoint prevents the creation of folder with name that corresponds to item id, we are going to:   
                  //1)create a folder with name in the following format '_<itemid>'
                  //2)rename a folder from '_<itemid>'' into '<itemid>'
                  //This allow to bypass the limitation of creating attachment folders
                  attachmentsFolder = attachmentsRootFolder.get_folders().add('_' + itemId);
                  attachmentsFolder.moveTo(attachmentRootFolderUrl + '/' + itemId);
                  ctx.load(attachmentsFolder);
              }
              else {
                  var attachmentFolderUrl = String.format('{0}/Attachments/{1}', list.get_rootFolder().get_serverRelativeUrl(), itemId);
                  attachmentsFolder = ctx.get_web().getFolderByServerRelativeUrl(attachmentFolderUrl);
                  ctx.load(attachmentsFolder);
              }
              ctx.executeQueryAsync(
                   function () {
                       success(attachmentsFolder);
                   },
                   error);
          },
          error);
    }


    function uploadFile(folderUrl, fileName, fileContent, success, error) {
        var ctx = SP.ClientContext.get_current();
        var folder = ctx.get_web().getFolderByServerRelativeUrl(folderUrl);
        var encContent = new SP.Base64EncodedByteArray();
        for (var b = 0; b < fileContent.length; b++) {
            encContent.append(fileContent[b]);
        }
        var createInfo = new SP.FileCreationInformation();
        createInfo.set_content(encContent);
        createInfo.set_url(fileName);
        folder.get_files().add(createInfo);
        ctx.executeQueryAsync(success, error);
    }
    ///*******************************************************************************
}

function getWebProperties() {
    var attachmentFiles;
    var itemId = 1;
    var ctx = new SP.ClientContext.get_current();

    var web = ctx.get_web();
    var attachmentFolder = web.getFolderByServerRelativeUrl('Lists/AttachmentList/Attachments/' + itemId);
    attachmentFiles = attachmentFolder.get_files();
    console.log(attachmentFiles);
    ctx.load(attachmentFiles);

    ctx.executeQueryAsync(Function.createDelegate(this, onSuccess), Function.createDelegate(this, onFailed));

    function onSuccess(sender, args) {
        var i = 0;
        var html = "";
        var relativeUrl = "";
        for (var file in attachmentFiles) {
            $('#result').html(html);
            if (attachmentFiles.itemAt(i).get_serverRelativeUrl()) {
                relativeUrl = attachmentFiles.itemAt(i).get_serverRelativeUrl();
                var fileName = String(relativeUrl);
                fileName = fileName.split("/");
                fileName = fileName[6];
                html += "<p><a href='" + relativeUrl + "'>" + fileName + "</a>";
                html += "<a onclick='deleteAttach(\"" + fileName + "\")' href='/'> Delete</a></p>";
            }
            i++;
        }
    }

    function onFailed(sender, args) {
        alert("sorry!");
    }
}

function deleteAttach(fileName) {
    var listTitle = 'AttachmentList'
    var itemId = 1;

    var ctx = SP.ClientContext.get_current();
    var list = ctx.get_web().get_lists().getByTitle(listTitle);
    var item = list.getItemById(itemId);
    var attachmentFile = item.get_attachmentFiles().getByFileName(fileName);
    attachmentFile.deleteObject();
    ctx.executeQueryAsync(
      function () {
          console.log('Attachment file has been deleted');
          location.reload();
      },
      function (sender, args) {
          console.log(args.get_message());
      });
}

