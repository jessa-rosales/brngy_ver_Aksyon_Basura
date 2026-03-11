const BASE_URL = "https://brngy-nzrth.onrender.com/api/announcements";

// ✅ Standardized Header Logic
const getHeaders = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token")}`
});

export const announcementService = {
  getAnnouncements: async () => {
    const res = await fetch(BASE_URL, { headers: getHeaders() });
    return res.json();
  },

  createAnnouncement: async (formDataObj) => {
    const data = new FormData();
    data.append("title", formDataObj.title);
    data.append("content", formDataObj.content);
    data.append("category", formDataObj.category);
    data.append("priority", formDataObj.priority);
    data.append("status", formDataObj.status);
    data.append("author_id", formDataObj.author_id);
    
    if (formDataObj.ann_photo) data.append("ann_photo", formDataObj.ann_photo);

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: getHeaders(), // ✅ Uses Bearer Token
      body: data
    });
    return res.json();
  },

  updateAnnouncement: async (id, formDataObj) => {
    const data = new FormData();
    data.append("title", formDataObj.title);
    data.append("content", formDataObj.content);
    data.append("category", formDataObj.category);
    data.append("priority", formDataObj.priority);
    data.append("status", formDataObj.status);
    data.append("last_edited_by", formDataObj.last_edited_by);

    if (formDataObj.ann_photo instanceof File) {
      data.append("ann_photo", formDataObj.ann_photo);
    }

    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "PUT",
      headers: getHeaders(), // ✅ Uses Bearer Token
      body: data
    });
    return res.json();
  },

  deleteAnnouncement: async (id) => {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return res.ok;
  }
};