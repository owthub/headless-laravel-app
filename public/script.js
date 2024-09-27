
$(document).ready(function(){

    // Add CKEditors to Textareas

    // Add Post Content
    ClassicEditor.create(document.querySelector("#postContent")).then( (editor) => {
        window.addPostEditor = editor;
    }).catch( (error) => {
        console.log(error);
    });

    // Edit Post Content
    ClassicEditor.create(document.querySelector("#editPostContent")).then( (editor) => {
        window.updatePostEditor = editor;
    }).catch( (error) => {
        console.log(error);
    });

    // Open Modal
    $("#addPostBtn").click(function(){

        $("#addPostModal").removeClass("hidden").addClass("flex");

        setTimeout(function(){

            $("#addPostModal").removeClass("opacity-0");
            $("#addPostModal .transform").removeClass("scale-90 opacity-0");
        }, 70);
    });

    // Close Modal
    $("#closeModalBtn").click(function(){

        $("#addPostModal").removeClass("flex").addClass("hidden");
        
        setTimeout(function(){
            $("#addPostModal").addClass("opacity-0");
            $("#addPostModal .transform").addClass("scale-90 opacity-0");
        }, 70);
    });

    // Open Edit Modal
    $(document).on("click", ".btn-edit-post", function(){

        $("#editPostModal").removeClass("hidden").addClass("flex");
        setTimeout(function(){
            $("#editPostModal").removeClass("opacity-0");
            $("#editPostModal .transform").removeClass("scale-90 opacity-0");
        }, 70);
    });

    // Close Edit Modal
    $(document).on("click", "#closeModalEditBtn", function(){

        $("#editPostModal").removeClass("flex").addClass("hidden");
        setTimeout(function(){
            $("#editPostModal").addClass("opacity-0");
            $("#editPostModal .transform").addClass("scale-90 opacity-0");
        }, 70);
    });

    // Open Post View in New Tab
    $(document).on("click", ".btn-open-post-view", function(){

        let postURL = $(this).data("url");
        window.open(postURL, "_blank");
    });

    // Submit Add Post Form
    $("#addPostForm").on("submit", function(event){

        event.preventDefault();

        $(".page-loader").removeClass("hide_element");

        let postData = {
            "title": $("#postTitle").val(),
            "content": addPostEditor.getData(),
            "status": $("#postStatus").val(),
            "categories": [parseInt($("#postCategory").val())],
            "featured_media": 0
        };

        let featuredImageFile = $("#uploadImage")[0].files[0];

        if(featuredImageFile){

            // Image File to WP
            // Media ID
            // Create Post
            var formData = new FormData();
            formData.append("file", featuredImageFile);

            $.ajax({
                url: "http://localhost/headless-apps/wp-app/wp-json/wp/v2/media",
                data: formData,
                method: "POST",
                dataType: "json",
                processData: false,
                contentType: false,
                headers: {
                    //"Authorization": "Basic " + btoa("admin:admin")
                    "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
                },
                success: function(response){
                    
                    let mediaId = response.id;

                    postData.featured_media = mediaId;

                    createWPPost(postData);
                },
                error: function(error){

                }
            })
        } else {

            // Create Post
            createWPPost(postData);
        }
    });

    // Read Single Post
    $(document).on("click", ".btn-edit-post", function(){

        let postID = $(this).attr("data-id");

        // Add Loader
        $(".page-loader").removeClass("hide_element");

        getSinglePostData(postID, function(response){

            console.log(response);
            $("#editPostTitle").val(response.title.rendered);
            let categoryId = response.categories.length > 0 ? response.categories[0] : null;
            $("#editPostCategory").val(categoryId);
            updatePostEditor.setData(response.content.rendered);
            $("#editPostStatus").val(response.status);
            $("#editPostID").val(response.id);

            let mediaId = response.featured_media > 0 ? response.featured_media : null;

            if(mediaId) {

                $("#editfeaturedMediaID").val(mediaId);

                // Image Source URL
                fetchMediaURL(mediaId, function(mediaAPIResponse){
                    let mediaURL = mediaAPIResponse.source_url;
                    $("#editPostImageUrl").attr("src", mediaURL);
                    $(".page-loader").addClass("hide_element");
                });
            } else{

                // Default Image URL
                $("#editPostImageUrl").attr("src", "https://www.contentviewspro.com/wp-content/uploads/2017/07/default_image.png");
                $(".page-loader").addClass("hide_element");
            }
        });
    });

    // Submit Edit Form
    $("#editPostForm").on("submit", function(event){
        event.preventDefault();

        let postID = $("#editPostID").val();

        let postDataObject = {
            "title": $("#editPostTitle").val(),
            "content": updatePostEditor.getData(),
            "categories": [parseInt($("#editPostCategory").val())],
            "status": $("#editPostStatus").val(),
            "featured_media": 0
        };

        let editPostImageFileObject = $("#editPostImage")[0].files[0];

        if(editPostImageFileObject){

            let formData = new FormData();
            formData.append("file", editPostImageFileObject);

            $.ajax({
                url: "http://localhost/headless-apps/wp-app/wp-json/wp/v2/media",
                data: formData,
                method: "POST",
                dataType: "json",
                processData: false,
                contentType: false,
                headers: {
                    //"Authorization": "Basic " + btoa("admin:admin")
                    "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
                },
                success: function(response){
                    
                    let mediaId = response.id;

                    postDataObject.featured_media = mediaId;

                    updateWPPost(postID, postDataObject);
                },
                error: function(error){

                }
            })
        } else{
            // Existing ID value
            postDataObject.featured_media = parseInt($("#editfeaturedMediaID").val());
            updateWPPost(postID, postDataObject);
        }
    });

    // Delete Button event
    $(document).on("click", ".btn-delete-post", function(){

        let postId = $(this).data("id");
        if(confirm("Are you sure want to delete?")){
            deleteWPPost(postId, function(response){
                if(response){
                    location.reload();
                } else {
                    alert(response);
                }
            });
        }
    });

    // Create JWT Auth token
    generateJWTAuthToken(function(response){

        if(response){

            // Read Posts
            fetchPosts();

            fetchAllCategories();
        }
    });
});

// List Posts
const fetchPosts = () => {

    $(".page-loader").removeClass("hide_element");

    $.ajax({
        url: "http://localhost/headless-apps/wp-app/wp-json/wp/v2/posts",
        method: "GET",
        data:{
            status: "any"
        },
        dataType: "json",
        headers : {
           // "Authorization" : "Basic " + btoa("admin:admin")
           "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
        },
        success: function(response){
           
            let $listPostParentID = $("#posts-list");

            const postsData = response;

            postsData.forEach((post) => {

                let categoryID = post.categories.length > 0 ? post.categories[0] : null;
                let mediaID = post.featured_media;

                if(mediaID !== 0){

                    fetchMediaURL(mediaID, function(mediaAPIResponse){

                        let mediaURL = mediaAPIResponse.source_url;

                        if(categoryID){

                            fetchCategoryTitle(categoryID, function(categoryAPIResponse){
        
                                let categoryName = categoryAPIResponse.name;
            
                                bindPostDataTemplate($listPostParentID, post, categoryName, mediaURL);
                            });
                        } else{
        
                            let categoryName = "Uncategorized";
            
                            bindPostDataTemplate($listPostParentID, post, categoryName, mediaURL);
                        }
                    });
                } else{

                    let defaultMediaURL = "https://www.contentviewspro.com/wp-content/uploads/2017/07/default_image.png";

                    if(categoryID){

                        fetchCategoryTitle(categoryID, function(categoryAPIResponse){
    
                            let categoryName = categoryAPIResponse.name;
        
                            bindPostDataTemplate($listPostParentID, post, categoryName, defaultMediaURL);
                        });
                    } else{
    
                        let categoryName = "Uncategorized";
        
                        bindPostDataTemplate($listPostParentID, post, categoryName, defaultMediaURL);
                    }
                }
            }); 

            $(".page-loader").addClass("hide_element");
        }
    })
}

// Bind Post with Template
const bindPostDataTemplate = ($htmlParentID, post, categoryName, mediaURL) => {

    let draftSpanTag = '';
    let publishModeView = "";

    if(post.status == "draft"){
        draftSpanTag = '<span class="bg-red-500 text-white py-1" style="padding-top: 5px; padding-bottom: 5px; width: 44px; text-align: center; display: inline-block;">Draft</span>';
    } else if(post.status == "publish"){
        draftSpanTag = '<span class="bg-green-500 text-white py-1" style="padding-top: 5px; padding-bottom: 5px; width: 44px; text-align: center; display: inline-block;">Live</span>';

        publishModeView = `<button class="bg-orange-500 hover:bg-orange-600 text-white py-1 px-3 rounded btn-open-post-view" data-url="${post.link}">Post View</button>`;
    }

    let singlePostHTMLTemplate = `
        <div class="bg-white shadow-md rounded-lg overflow-hidden">
            
            ${draftSpanTag}

            <img src="${mediaURL}" alt="#" class="w-full h-48 object-cover">
            <div class="p-4">
                <h3 class="text-xl font-semibold mb-2">${post.title.rendered}</h3>
                <p class="text-gray-600 text-sm">${post.content.rendered}</p>
                <span class="text-sm text-blue-500 font-semibold">Category: ${categoryName}</span> <br/>
                <span class="text-sm text-blue-500 font-semibold">Status: ${post.status}</span>
                <div class="mt-4 flex space-x-2">
                    <button class="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded btn-edit-post" data-id="${post.id}">Edit</button>
                    <button class="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded btn-delete-post" data-id="${post.id}">Delete</button>
                    ${publishModeView}
                </div>
            </div>
        </div>
    `;

    $htmlParentID.append(singlePostHTMLTemplate);
}

// Get Category Title Name
const fetchCategoryTitle = (categoryID, callback) => {

    $.ajax({
        url: `http://localhost/headless-apps/wp-app/wp-json/wp/v2/categories/${categoryID}`,
        method: "GET",
        dataType: "json",
        headers:{
            //"Authorization": "Basic " + btoa("admin:admin")
            "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
        },
        success: function(response){
            //console.log(response)
            callback(response);
        },
        error: function(error){

        }
    });
}

// Get Media Image URL
const fetchMediaURL = (mediaID, callback) => {

    $.ajax({
        url: "http://localhost/headless-apps/wp-app/wp-json/wp/v2/media/" + mediaID,
        headers: {
            //"Authorization": "Basic " + btoa("admin:admin")
           "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
        },
        method: "GET",
        dataType: "json",
        success: function(response){
            //console.log(response);
            callback(response);
        },
        error: function(response){

        }
    })
}

// Get All Categories
const fetchAllCategories = () => {
    $.ajax({
        url: "http://localhost/headless-apps/wp-app/wp-json/wp/v2/categories",
        method: "GET",
        headers: {
            //"Authorization": "Basic " + btoa("admin:admin")
            "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
        },
        dataType: "json",
        success: function(response){
            let addPostCategoryDdID = $("#postCategory");
            let editPostCategoryDdId = $("#editPostCategory");
            let categoryHTML = '<option>- Select -</option>';

            response.forEach( (category) => {

                categoryHTML += `<option value="${category.id}">${category.name}</option>`
            });

            addPostCategoryDdID.append(categoryHTML);
            editPostCategoryDdId.append(categoryHTML);
        },
        error: function(response) {
            console.log(response);
        }
    })
}

// Create WP Post
const createWPPost = (postDataObject) => {

    $.ajax({
        url: "http://localhost/headless-apps/wp-app/wp-json/wp/v2/posts",
        method: "POST",
        headers: {
            //"Authorization": "Basic " + btoa("admin:admin"),
            "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token"),
            "Content-Type": "application/json"
        },
        dataType: "json",
        data: JSON.stringify(postDataObject),
        success: function(response){
            $(".page-loader").addClass("hide_element");
            location.reload();
        },
        error: function(error){
            console.log(error);
        }
    })
}

// Read Single Post Data
const getSinglePostData = (postId, callback) => {
    $.ajax({
        url: `http://localhost/headless-apps/wp-app/wp-json/wp/v2/posts/${postId}`,
        method: "GET",
        headers: {
            //"Authorization": "Basic " + btoa("admin:admin")
            "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
        },
        dataType: "json",
        success: function(response){
            callback(response);
        },
        error: function(error){
            console.log(error);
        }
    })
}

// Update Post
const updateWPPost = (postId, postData) => {

    $.ajax({
        url: `http://localhost/headless-apps/wp-app/wp-json/wp/v2/posts/${postId}`,
        data: JSON.stringify(postData),
        method: "POST",
        headers: {
            //"Authorization": "Basic " + btoa("admin:admin")
            "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token"),
            "Content-Type" : "application/json"
        },
        dataType: "json",
        success: function(response){
            console.log(response);
            location.reload();
        },
        error: function(errorResponse){
            console.log(errorResponse);
        }
    })
}

// Delete Post
const deleteWPPost = (postId, callback) => {

    $.ajax({
        url: `http://localhost/headless-apps/wp-app/wp-json/wp/v2/posts/${postId}?force=true`,
        headers: {
            //"Authorization": "Basic " + btoa("admin:admin")
            "Authorization": "Bearer " + localStorage.getItem("jwt_auth_token")
        },
        dataType: "json",
        method: "DELETE",
        success: function(response){
            callback(true);
        },
        error: function(errorResponse){
            console.log(errorResponse);
            callback(false);
        }
    })
}

// Generate JWT Token Value
const generateJWTAuthToken = (callback) => {

    $.ajax({
        url: "http://localhost/headless-apps/wp-app/wp-json/jwt-auth/v1/token",
        method: "POST",
        data: {
            username: "admin",
            password: "admin"
        },
        dataType: "json",
        success: function(response){
            console.log(response);
            localStorage.setItem("jwt_auth_token", response.token);
            callback(true);
        },
        error: function(errorResponse){
            console.log(errorResponse);
        }
    })
}